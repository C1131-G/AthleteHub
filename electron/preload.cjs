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
    sessions: {
      complete: (input) => ipcRenderer.invoke("sessions.complete", input),
      get: (sessionId) => ipcRenderer.invoke("sessions.get", sessionId),
      listByAthlete: (athleteId) =>
        ipcRenderer.invoke("sessions.listByAthlete", athleteId),
      saveDraft: (input) => ipcRenderer.invoke("sessions.saveDraft", input),
    },
  },
  platform: process.platform,
});
