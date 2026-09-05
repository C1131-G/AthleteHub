/**
 * Register authenticated athlete-photo IPC handlers.
 * Photo files are kept under the Electron user-data directory by the runtime.
 */
const registerPhotoHandlers = ({
  ipcMain,
  startBackendRuntime,
  getSessionService,
  getRuntime,
}) => {
  ipcMain.handle("photos.save", async (event, input) => {
    await startBackendRuntime();
    await getSessionService(event);
    return getRuntime().savePhoto(input);
  });

  ipcMain.handle("photos.read", async (event, name) => {
    await startBackendRuntime();
    await getSessionService(event);
    return getRuntime().readPhoto(name);
  });
};

module.exports = { registerPhotoHandlers };
