/**
 * Register authenticated preference IPC handlers.
 * Dependencies are injected so this module stays independent of Electron
 * startup state and can be exercised with a test IPC harness.
 */
const registerPreferenceHandlers = ({
  ipcMain,
  startBackendRuntime,
  getAuthService,
  getRuntime,
}) => {
  ipcMain.handle("preferences.read", async (event) => {
    await startBackendRuntime();
    await getAuthService(event).requireSession();
    return getRuntime().readPreferences();
  });

  ipcMain.handle("preferences.write", async (event, partial) => {
    await startBackendRuntime();
    await getAuthService(event).requireSession();
    return getRuntime().writePreferences(partial);
  });
};

module.exports = { registerPreferenceHandlers };
