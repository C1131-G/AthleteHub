const {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  nativeTheme,
  shell,
} = require("electron");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const {
  accessSync,
  constants: fsConstants,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { createServer } = require("node:net");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { pathToFileURL } = require("node:url");
const { setTimeout: delay } = require("node:timers/promises");
const { z } = require("zod");
const { registerPreferenceHandlers } = require("./ipc/preferences.cjs");
const { registerPhotoHandlers } = require("./ipc/photos.cjs");
const { registerUpdateHandlers } = require("./ipc/updates.cjs");

const HOST = "127.0.0.1";
const PROJECT_ROOT = path.resolve(__dirname, "..");

/**
 * Scratch-profile override for automated Electron runs so they never touch a
 * real database. Must be applied before anything resolves a userData path.
 */
if (process.env.ATHLETE360_USER_DATA) {
  app.setPath("userData", process.env.ATHLETE360_USER_DATA);
}

const isProductionPreview = process.argv.includes("--production");
const isProduction = app.isPackaged || isProductionPreview;

/**
 * Set ATHLETE360_BOOT_TRACE=1 to print milliseconds-since-process-start for
 * each startup milestone, so regressions in time-to-interactive-login show up
 * before they are felt.
 */
const bootMark = (label) => {
  if (process.env.ATHLETE360_BOOT_TRACE === "1") {
    console.error(`[boot-trace] ${label}: ${Math.round(performance.now())}ms`);
  }
};

const loginFilePath = () => path.join(__dirname, "login.html");

const loginWindowUrl = () => pathToFileURL(loginFilePath()).href;

let serverProcess;
let serverOrigin;
let runtime;
const authServices = new Map();
const sessionServices = new Map();
const collectionServices = new Map();

const findFreePort = async () => {
  const probe = createServer();

  probe.listen(0, HOST);
  await once(probe, "listening");

  const { port } = probe.address();

  probe.close();
  await once(probe, "close");

  return port;
};

const persistedPortPath = () =>
  path.join(app.getPath("userData"), "server-port.json");

const readPersistedPort = () => {
  try {
    const parsed = JSON.parse(readFileSync(persistedPortPath(), "utf-8"));
    return Number.isInteger(parsed.port) && parsed.port > 0
      ? parsed.port
      : null;
  } catch {
    return null;
  }
};

const isPortAvailable = async (port) => {
  const probe = createServer();
  try {
    await new Promise((resolve, reject) => {
      probe.once("error", reject);
      probe.listen(port, HOST, resolve);
    });
    return true;
  } catch {
    return false;
  } finally {
    probe.close();
  }
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
 * The V8 compile cache lets the server skip recompiling its large module graph
 * on every launch after the first.
 */
const startProductionServer = (port) => {
  const entry = resolveStandaloneEntry();
  const compileCachePath = path.join(app.getPath("userData"), "compile-cache");
  mkdirSync(compileCachePath, { recursive: true });

  serverProcess = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: HOST,
      NODE_COMPILE_CACHE: compileCachePath,
      NODE_ENV: "production",
      PORT: String(port),
    },
    stdio: "inherit",
    windowsHide: true,
  });
  bootMark("server spawned");
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
  bootMark("server spawned");
};

/**
 * Early probes are cheap and the server usually starts answering within a few
 * of them, so ramping the backoff avoids idling ~125 ms past readiness on a
 * flat 250 ms poll while still capping the total wait.
 */
const READINESS_DELAYS_MS = [15, 15, 25, 50, 100, 250];

const waitForServer = async (origin, attempt = 0) => {
  try {
    await fetch(origin);
  } catch {
    if (attempt >= 120) {
      throw new Error(`Next.js server at ${origin} did not start in time.`);
    }

    await delay(
      READINESS_DELAYS_MS[Math.min(attempt, READINESS_DELAYS_MS.length - 1)]
    );
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

/**
 * A login can arrive while the server is still booting, so concurrent callers
 * share one start attempt instead of the second one racing the first.
 */
let serverStartPromise;

const startServer = async () => {
  if (!isProduction) {
    const existingDevServer = await findExistingDevServer();
    if (existingDevServer) {
      serverOrigin = existingDevServer;
      return serverOrigin;
    }
  }

  const savedPort = readPersistedPort();
  if (savedPort !== null && !(await isPortAvailable(savedPort))) {
    throw new Error(
      `SSAIT Athlete360 server port ${savedPort} is already in use.`
    );
  }
  const port = savedPort ?? (await findFreePort());
  if (savedPort === null) {
    writeFileSync(persistedPortPath(), JSON.stringify({ port }), "utf-8");
  }

  serverOrigin = `http://${HOST}:${port}`;

  if (isProduction) {
    startProductionServer(port);
  } else {
    startDevServer(port);
  }

  await waitForServer(serverOrigin);
  bootMark("server ready");

  return serverOrigin;
};

const ensureServer = () => {
  if (isServerRunning() && serverOrigin) {
    return Promise.resolve(serverOrigin);
  }

  serverStartPromise ??= startServer().finally(() => {
    serverStartPromise = undefined;
  });
  return serverStartPromise;
};

/**
 * Attached as soon as the window exists so even the local login phase is
 * fenced: renderer-initiated navigation is allowed only back to the login file
 * or into the app origin once it is known, and anything else opens externally.
 */
const attachNavigationPolicy = (contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  contents.on("will-navigate", (event, url) => {
    const isAppUrl =
      serverOrigin &&
      (url === serverOrigin || url.startsWith(`${serverOrigin}/`));
    if (isAppUrl || url === loginWindowUrl()) {
      return;
    }
    event.preventDefault();
    shell.openExternal(url);
  });
};

const resolveBackendEntry = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, "backend", "electron-backend.mjs")
    : path.join(PROJECT_ROOT, ".next", "electron-backend.mjs");

/**
 * Where the database and rolling backups live, chosen on first run and
 * changeable later from Settings. Same contract as
 * electron/location-config.ts, read here without the TS module since this
 * must resolve before the backend bundle (and therefore the database) exists.
 */
const LOCATION_CONFIG_FILE = "location.json";

const locationConfigPath = () =>
  path.join(app.getPath("userData"), LOCATION_CONFIG_FILE);

const legacyDatabasePath = () =>
  path.join(app.getPath("userData"), "athlete360.db");

const defaultLocationConfig = () => ({
  backupPath: path.join(app.getPath("userData"), "backups"),
  storagePath: app.getPath("userData"),
});

const folderPathSchema = z.string().trim().min(1);
/** Same shape whether it's read back from disk or submitted from a form. */
const locationConfigSchema = z.object({
  backupPath: folderPathSchema,
  storagePath: folderPathSchema,
});
const locationUpdateSchema = z.object({
  backupPath: folderPathSchema.optional(),
  password: z.string().min(1),
  storagePath: folderPathSchema.optional(),
});

const readLocationConfig = () => {
  try {
    const parsed = locationConfigSchema.safeParse(
      JSON.parse(readFileSync(locationConfigPath(), "utf-8"))
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

const writeLocationConfig = (config) => {
  writeFileSync(locationConfigPath(), JSON.stringify(config, null, 2), "utf-8");
  return config;
};

/**
 * Installs that already have a database from before this feature existed are
 * treated as already configured at today's default paths the first time this
 * runs, so upgrading never shows the location picker or moves anything. Only
 * a genuinely fresh install (no location.json AND no pre-existing database)
 * is unconfigured.
 */
const ensureLocationConfig = () => {
  const existing = readLocationConfig();
  if (existing) {
    return existing;
  }
  if (existsSync(legacyDatabasePath())) {
    return writeLocationConfig(defaultLocationConfig());
  }
  return null;
};

const databasePath = () =>
  path.join(
    (ensureLocationConfig() ?? defaultLocationConfig()).storagePath,
    "athlete360.db"
  );

const backupDirectory = () =>
  (ensureLocationConfig() ?? defaultLocationConfig()).backupPath;

/**
 * The login page is local, so it can never match the server origin. It is
 * trusted by exact file-URL match only — never a prefix — and only for the
 * auth channels; every data channel keeps the strict origin check.
 */
const assertTrustedSender = (event, { allowLoginWindow = false } = {}) => {
  const senderUrl = event.sender.getURL();
  if (allowLoginWindow && senderUrl === loginWindowUrl()) {
    return;
  }
  if (!serverOrigin || !senderUrl.startsWith(`${serverOrigin}/`)) {
    throw new Error("Untrusted renderer.");
  }
};

const getAuthService = (event, { allowLoginWindow = false } = {}) => {
  assertTrustedSender(event, { allowLoginWindow });
  let service = authServices.get(event.sender.id);
  if (!service) {
    service = runtime.createAuthService();
    authServices.set(event.sender.id, service);
    event.sender.once("destroyed", () => authServices.delete(event.sender.id));
  }
  return service;
};

const getSessionService = async (event) => {
  await getAuthService(event).requireSession();
  let service = sessionServices.get(event.sender.id);
  if (!service) {
    service = runtime.createSessionService();
    sessionServices.set(event.sender.id, service);
    event.sender.once("destroyed", () =>
      sessionServices.delete(event.sender.id)
    );
  }
  return service;
};

/**
 * Collection services are built per renderer for the same reason auth and
 * session services are, and behind the same session gate: an unauthenticated
 * or untrusted renderer must not reach the database.
 */
const getCollectionService = async (event, name) => {
  await getAuthService(event).requireSession();
  let services = collectionServices.get(event.sender.id);
  if (!services) {
    services = runtime.createCollectionServices();
    collectionServices.set(event.sender.id, services);
    event.sender.once("destroyed", () =>
      collectionServices.delete(event.sender.id)
    );
  }
  return services[name];
};

/**
 * The backend import is the slowest startup step, so it starts as early as
 * possible and every auth/session handler awaits it. Handlers are registered
 * synchronously at startup, which means an early login waits a few
 * milliseconds for the runtime instead of failing with "No handler
 * registered" — the backend is no longer on the critical path to a usable
 * login screen.
 */
let runtimeReadyPromise;

const registerCollectionHandlers = () => {
  for (const name of runtime.collectionNames) {
    for (const method of runtime.collectionMethods) {
      ipcMain.handle(`${name}.${method}`, async (event, ...args) => {
        const service = await getCollectionService(event, name);
        return service[method](...args);
      });
    }
  }
};

const startBackendRuntime = () => {
  runtimeReadyPromise ??= (async () => {
    const backendModule = await import(
      pathToFileURL(resolveBackendEntry()).href
    );
    runtime = await backendModule.createRuntime(`file:${databasePath()}`);
    registerCollectionHandlers();
    bootMark("backend runtime ready");
    return runtime;
  })();
  return runtimeReadyPromise;
};

/**
 * Navigates the renderer into the app once the server can answer, on behalf
 * of the local login page (continueToApp). Failures reject into the page's
 * catch so the user sees them; on success the page is torn down by the
 * navigation and the pending promise simply never settles.
 */
const navigateToApp = (contents, pathname = "/dashboard") =>
  ensureServer().then((origin) => {
    contents.once("did-finish-load", () => bootMark("first Next paint"));
    return contents.loadURL(`${origin}${pathname}`);
  });

/** Returns the renderer from the app to the local login screen. */
const navigateToLogin = (contents) => {
  contents.once("did-finish-load", () => bootMark("login painted"));
  return contents.loadFile(loginFilePath());
};

/** Destinations the local login page may ask the main process to open. */
const AUTHENTICATED_LOGIN_DESTINATIONS = new Set(["/dashboard"]);

/**
 * Recovery codes are four groups of four from electron/auth.ts's alphabet.
 * Anything else is rejected rather than copied or written to disk, so these
 * channels stay a recovery-code feature rather than a general-purpose
 * clipboard and file writer for the renderer.
 */
const recoveryCodeSchema = z.string().regex(/^[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/);

const parseRecoveryCode = (value) => {
  const parsed = recoveryCodeSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("That is not a recovery code.");
  }
  return parsed.data;
};

const recoveryCodeDocument = (code) =>
  [
    "SSAIT Athlete360 — recovery code",
    "",
    code,
    "",
    "This code is the only way to reset your password if you forget it.",
    "Keep this file somewhere safe, and separate from this computer.",
    "",
    `Saved ${new Date().toISOString().slice(0, 10)}`,
    "",
  ].join("\r\n");

const registerIpcHandlers = () => {
  /**
   * The local login page owns the whole account surface — login, first-run
   * setup, and recovery — so those channels trust it by exact file-URL match.
   * Logout is the exception: the app calls it, and the main process answers
   * it by navigating the sender back to the login page.
   */
  const handleAuth = (channel, action, { allowLoginWindow = false } = {}) => {
    ipcMain.handle(channel, async (event, input) => {
      await startBackendRuntime();
      const result = await action(
        getAuthService(event, { allowLoginWindow }),
        input,
        event
      );
      return result;
    });
  };

  handleAuth("auth.status", (service) => service.status(), {
    allowLoginWindow: true,
  });
  handleAuth("auth.login", (service, input) => service.login(input), {
    allowLoginWindow: true,
  });
  handleAuth("auth.setup", (service, input) => service.setup(input), {
    allowLoginWindow: true,
  });
  handleAuth("auth.recover", (service, input) => service.recover(input), {
    allowLoginWindow: true,
  });
  handleAuth("auth.changePassword", async (service, input) => {
    await service.requireSession();
    return service.changePassword(input);
  });
  handleAuth("auth.logout", async (service, _input, event) => {
    await service.logout();
    if (event.sender.getURL() !== loginWindowUrl()) {
      // Deferred so the invoke response reaches the renderer before the page
      // it is rendered in is torn down by the navigation.
      setImmediate(() => {
        navigateToLogin(event.sender);
      });
    }
  });

  ipcMain.handle("app.continue", async (event, destination) => {
    assertTrustedSender(event, { allowLoginWindow: true });
    if (!AUTHENTICATED_LOGIN_DESTINATIONS.has(destination)) {
      throw new Error("Unsupported destination.");
    }
    await startBackendRuntime();
    await getAuthService(event, { allowLoginWindow: true }).requireSession();
    navigateToApp(event.sender, destination);
  });

  ipcMain.handle("app.copyRecoveryCode", (event, code) => {
    assertTrustedSender(event, { allowLoginWindow: true });
    clipboard.writeText(parseRecoveryCode(code));
  });

  /**
   * The renderer hands over the code and nothing else — the surrounding text
   * and the extension are composed here, so this channel can never be used to
   * write chosen bytes to a chosen path. The user still picks the location.
   */
  ipcMain.handle("app.saveRecoveryCode", async (event, code) => {
    assertTrustedSender(event, { allowLoginWindow: true });
    const recoveryCode = parseRecoveryCode(code);
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showSaveDialog(parentWindow ?? undefined, {
      defaultPath: "ssait-athlete360-recovery-code.txt",
      filters: [{ extensions: ["txt"], name: "Text file" }],
    });
    if (result.canceled || !result.filePath) {
      return { saved: false };
    }
    writeFileSync(result.filePath, recoveryCodeDocument(recoveryCode), "utf-8");
    return { path: result.filePath, saved: true };
  });

  /**
   * Reachable from the local login page (before any account or database
   * exists) as well as from the running app's Settings page, so every handler
   * here trusts the login window in addition to the server origin.
   */
  /**
   * Reports the paths actually in use, falling back to the defaults when
   * nothing has been configured — the app no longer asks where to put its
   * data, so there is always an effective answer, and Settings should show it
   * rather than "not configured".
   */
  ipcMain.handle("location.status", (event) => {
    assertTrustedSender(event, { allowLoginWindow: true });
    const config = ensureLocationConfig() ?? defaultLocationConfig();
    return {
      backupPath: config.backupPath,
      storagePath: config.storagePath,
    };
  });

  ipcMain.handle("location.choose", async (event) => {
    assertTrustedSender(event, { allowLoginWindow: true });
    const parentWindow = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(parentWindow ?? undefined, {
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled || result.filePaths.length === 0
      ? null
      : result.filePaths[0];
  });

  ipcMain.handle("location.update", async (event, input) => {
    await startBackendRuntime();
    const service = getAuthService(event);
    await service.requireSession();
    const parsedInput = locationUpdateSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new Error("A password is required to change the storage location.");
    }
    const verified = await service.verifyPassword(parsedInput.data.password);
    if (!verified) {
      throw new Error("The password is incorrect.");
    }

    const current = ensureLocationConfig() ?? defaultLocationConfig();
    const nextStoragePath = parsedInput.data.storagePath ?? current.storagePath;
    const nextBackupPath = parsedInput.data.backupPath ?? current.backupPath;

    mkdirSync(nextStoragePath, { recursive: true });
    mkdirSync(nextBackupPath, { recursive: true });
    accessSync(nextStoragePath, fsConstants.W_OK);
    accessSync(nextBackupPath, fsConstants.W_OK);

    if (runtime) {
      await runtime.close();
      runtime = undefined;
      runtimeReadyPromise = undefined;
    }

    const currentDbPath = path.join(current.storagePath, "athlete360.db");
    const nextDbPath = path.join(nextStoragePath, "athlete360.db");
    if (nextStoragePath !== current.storagePath && existsSync(currentDbPath)) {
      copyFileSync(currentDbPath, nextDbPath);
    }
    if (
      nextBackupPath !== current.backupPath &&
      existsSync(current.backupPath)
    ) {
      cpSync(current.backupPath, nextBackupPath, { recursive: true });
    }

    writeLocationConfig({
      backupPath: nextBackupPath,
      storagePath: nextStoragePath,
    });

    // The libSQL client can't be re-pointed at a new file in place, so the
    // simplest safe path is to relaunch: the next startBackendRuntime() call
    // reads the just-written location.json and opens the database there.
    setImmediate(() => {
      app.relaunch();
      app.exit(0);
    });

    return { restarting: true };
  });

  const handleSession = (channel, action) => {
    ipcMain.handle(channel, async (event, ...args) => {
      await startBackendRuntime();
      const service = await getSessionService(event);
      return action(service, ...args);
    });
  };

  registerPreferenceHandlers({
    getAuthService,
    getRuntime: () => runtime,
    ipcMain,
    startBackendRuntime,
  });
  registerUpdateHandlers({
    assertTrustedSender: (event) => assertTrustedSender(event),
    getWindows: () => BrowserWindow.getAllWindows(),
    ipcMain,
    // Strictly app.isPackaged, not isProduction: a --production preview run
    // has no app-update.yml (electron-builder only writes one when it
    // packages), so checking there would just surface a stray error banner.
    isPackaged: app.isPackaged,
  });
  registerPhotoHandlers({
    getRuntime: () => runtime,
    getSessionService,
    ipcMain,
    startBackendRuntime,
  });

  handleSession("sessions.get", (service, sessionId) => service.get(sessionId));
  handleSession("sessions.listAll", (service) => service.listAll());
  handleSession("sessions.listByAthlete", (service, athleteId) =>
    service.listByAthlete(athleteId)
  );
  handleSession("sessions.saveDraft", (service, input) =>
    service.saveDraft(input)
  );
  handleSession("sessions.complete", (service, input) =>
    service.complete(input)
  );
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
  bootMark("window created");

  attachNavigationPolicy(mainWindow.webContents);

  /**
   * Paint the real login form instead of a spinner: it needs no server, so
   * the user can start typing while the Next server boots in the background.
   * A successful login navigates into the app from the main process.
   */
  mainWindow.maximize();
  mainWindow.webContents.once("did-finish-load", () =>
    bootMark("login painted")
  );
  await mainWindow.loadFile(loginFilePath());
  mainWindow.show();
};

/**
 * Both services start before the window and are awaited only by their
 * consumers; a failure in either is fatal, so the app quits.
 */
const startServices = async () => {
  try {
    // The storage location is settled before the app runs — written by the
    // installer, or the defaults under userData — so the backend no longer
    // has to wait for the user to confirm one and can warm up alongside the
    // server.
    await Promise.all([ensureServer(), startBackendRuntime()]);
  } catch (error) {
    console.error(error);
    app.quit();
  }
};

const startApp = async () => {
  await app.whenReady();
  bootMark("whenReady");

  registerIpcHandlers();
  startServices();

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

/**
 * Keeps a rolling copy of the database next to it. The app is offline and
 * single-user, so a corrupted or mistakenly emptied database would otherwise
 * have nothing to fall back on. Runs after the client closes so the file is
 * not mid-write, and never blocks the quit. The number of copies kept is the
 * backup-count preference; the file is read fresh so hand edits also apply.
 */
/** Same contract as electron/preferences.ts, read without the TS module. */
const PREFERENCES_FILE = "preferences.json";
const readBackupCount = () => {
  try {
    const parsed = JSON.parse(
      readFileSync(
        path.join(app.getPath("userData"), PREFERENCES_FILE),
        "utf-8"
      )
    );
    const count = Number(parsed.backupCount);
    return Number.isInteger(count) && count >= 1 && count <= 30 ? count : 7;
  } catch {
    return 7;
  }
};

const writeRollingBackup = () => {
  try {
    const backupCount = readBackupCount();
    const source = databasePath();
    if (!existsSync(source)) {
      return;
    }
    const directory = backupDirectory();
    mkdirSync(directory, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
    copyFileSync(source, path.join(directory, `athlete360-${stamp}.db`));

    const existing = readdirSync(directory)
      .filter((name) => name.startsWith("athlete360-") && name.endsWith(".db"))
      .toSorted();
    for (const name of existing.slice(0, -backupCount)) {
      rmSync(path.join(directory, name), { force: true });
    }
  } catch (error) {
    // A failed backup must never stop the app from closing.
    console.error("Could not write the database backup.", error);
  }
};

app.on("before-quit", async () => {
  if (runtime) {
    await runtime.close();
  }
  writeRollingBackup();
  stopServer();
});
