const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  backend: {
    auth: {
      login: (input) => ipcRenderer.invoke("auth.login", input),
      logout: () => ipcRenderer.invoke("auth.logout"),
      recover: (input) => ipcRenderer.invoke("auth.recover", input),
      setup: (input) => ipcRenderer.invoke("auth.setup", input),
      status: () => ipcRenderer.invoke("auth.status"),
    },
  },
  platform: process.platform,
});
