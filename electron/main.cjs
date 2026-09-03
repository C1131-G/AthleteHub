const { app, BrowserWindow, ipcMain, nativeTheme, shell } = require("electron");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { existsSync, readFileSync } = require("node:fs");
const { createServer } = require("node:net");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { setTimeout: delay } = require("node:timers/promises");

const HOST = "127.0.0.1";
const PROJECT_ROOT = path.resolve(__dirname, "..");
const isProductionPreview = process.argv.includes("--production");
const isProduction = app.isPackaged || isProductionPreview;

let serverProcess;
let serverOrigin;
let runtime;
const authServices = new Map();

const findFreePort = async () => {
  const probe = createServer();

  probe.listen(0, HOST);
  await once(probe, "listening");

  const { port } = probe.address();

  probe.close();
  await once(probe, "close");

  return port;
};

const findExistingDevServer = async () => {
  const lockPath = path.join(PROJECT_ROOT, ".next", "dev", "lock");
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    const lock = JSON.parse(readFileSync(lockPath, "utf-8"));
    const { appUrl } = lock;
    const parsedUrl = new URL(appUrl);
    if (parsedUrl.hostname !== HOST) {
      return null;
    }

    const { origin } = parsedUrl;
    await fetch(origin);
    return origin;
  } catch {
    return null;
  }
};

/**
 * The standalone bundle lives next to the build in development previews and is
 * shipped as an unpacked resource in packaged apps.
 */
const resolveStandaloneEntry = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, "standalone", "server.js")
    : path.join(PROJECT_ROOT, ".next", "standalone", "server.js");

/**
 * Electron's binary doubles as a Node runtime under ELECTRON_RUN_AS_NODE, so
 * the packaged app runs the Next server without bundling a second runtime.
 */
const startProductionServer = (port) => {
  const entry = resolveStandaloneEntry();

  serverProcess = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: HOST,
      NODE_ENV: "production",
      PORT: String(port),
    },
    stdio: "inherit",
    windowsHide: true,
  });
};

const startDevServer = (port) => {
  const bunCommand = process.platform === "win32" ? "bun.exe" : "bun";

  serverProcess = spawn(
    bunCommand,
    ["run", "dev", "--", "--hostname", HOST, "--port", String(port)],
    {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      windowsHide: true,
    }
  );
};

const waitForServer = async (origin, attempt = 0) => {
  try {
    await fetch(origin);
  } catch {
    if (attempt >= 120) {
      throw new Error(`Next.js server at ${origin} did not start in time.`);
    }

    await delay(250);
    await waitForServer(origin, attempt + 1);
  }
};

const isServerRunning = () =>
  Boolean(serverProcess) && serverProcess.exitCode === null;

/**
 * `kill()` only reaps the direct child on Windows, which strands the `next`
 * process holding the port. Tear down the whole tree instead.
 */
const stopServer = () => {
  if (!isServerRunning()) {
    serverProcess = undefined;
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(serverProcess.pid), "/T", "/F"], {
      windowsHide: true,
    });
  } else {
    serverProcess.kill();
  }

  serverProcess = undefined;
};

const ensureServer = async () => {
  if (isServerRunning() && serverOrigin) {
    return serverOrigin;
  }

  if (!isProduction) {
    const existingDevServer = await findExistingDevServer();
    if (existingDevServer) {
      serverOrigin = existingDevServer;
      return serverOrigin;
    }
  }

  const port = await findFreePort();

  serverOrigin = `http://${HOST}:${port}`;

  if (isProduction) {
    startProductionServer(port);
  } else {
    startDevServer(port);
  }

  await waitForServer(serverOrigin);

  return serverOrigin;
};

const applyNavigationPolicy = (contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  contents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${serverOrigin}/`) && url !== serverOrigin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
};

const resolveBackendEntry = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, "backend", "electron-backend.mjs")
    : path.join(PROJECT_ROOT, ".next", "electron-backend.mjs");

const getAuthService = (event) => {
  const senderUrl = event.sender.getURL();
  if (!serverOrigin || !senderUrl.startsWith(`${serverOrigin}/`)) {
    throw new Error("Untrusted renderer.");
  }
  let service = authServices.get(event.sender.id);
  if (!service) {
    service = runtime.createAuthService();
    authServices.set(event.sender.id, service);
    event.sender.once("destroyed", () => authServices.delete(event.sender.id));
  }
  return service;
};

const registerBackendIpc = async () => {
  if (runtime) {
    return;
  }
  const backendModule = await import(pathToFileURL(resolveBackendEntry()).href);
  runtime = await backendModule.createRuntime(
    `file:${path.join(app.getPath("userData"), "athletehub.db")}`
  );

  ipcMain.handle("auth.status", (event) => getAuthService(event).status());
  ipcMain.handle("auth.setup", (event, input) =>
    getAuthService(event).setup(input)
  );
  ipcMain.handle("auth.login", (event, input) =>
    getAuthService(event).login(input)
  );
  ipcMain.handle("auth.recover", (event, input) =>
    getAuthService(event).recover(input)
  );
  ipcMain.handle("auth.logout", (event) => getAuthService(event).logout());
};

/**
 * Paint the window in the app's own background colour so the frame that appears
 * before the first render doesn't flash white on a dark desktop.
 */
const resolveBackgroundColor = () =>
  nativeTheme.shouldUseDarkColors ? "#0a0b0d" : "#ffffff";

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    backgroundColor: resolveBackgroundColor(),
    height: 800,
    minHeight: 640,
    minWidth: 960,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
    width: 1280,
  });

  /**
   * Show a maximized splash immediately instead of waiting on the server, so
   * the app is on screen within a frame or two of launch.
   */
  mainWindow.maximize();
  await mainWindow.loadFile(path.join(__dirname, "splash.html"));
  mainWindow.show();

  const origin = await ensureServer();

  await registerBackendIpc();

  applyNavigationPolicy(mainWindow.webContents);

  await mainWindow.loadURL(origin);
};

const startApp = async () => {
  await app.whenReady();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
};

const runApp = async () => {
  try {
    await startApp();
  } catch (error) {
    console.error(error);
    app.quit();
  }
};

if (app.requestSingleInstanceLock()) {
  app.on("second-instance", () => {
    const [existingWindow] = BrowserWindow.getAllWindows();

    if (existingWindow) {
      if (existingWindow.isMinimized()) {
        existingWindow.restore();
      }

      existingWindow.focus();
    }
  });

  runApp();
} else {
  app.quit();
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  if (runtime) {
    await runtime.close();
  }
  stopServer();
});
