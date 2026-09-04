const { contextBridge, ipcRenderer } = require("electron");

const COLLECTION_NAMES = [
  "assessments",
  "athletes",
  "conditioningAssessments",
  "conditioningProgrammes",
  "equipment",
  "monthlyCycles",
  "monthlyReports",
  "trainingPlans",
  "weeklyReports",
];

/**
 * Built from a list so a renamed channel cannot silently lose a method. Each
 * call forwards its arguments untouched; the main process validates them.
 */
const collectionBridge = () =>
  Object.fromEntries(
    COLLECTION_NAMES.map((name) => [
      name,
      {
        archive: (id) => ipcRenderer.invoke(`${name}.archive`, id),
        create: (input) => ipcRenderer.invoke(`${name}.create`, input),
        get: (id) => ipcRenderer.invoke(`${name}.get`, id),
        importRecord: (record) =>
          ipcRenderer.invoke(`${name}.importRecord`, record),
        list: (options) => ipcRenderer.invoke(`${name}.list`, options),
        restore: (id) => ipcRenderer.invoke(`${name}.restore`, id),
        update: (id, input) => ipcRenderer.invoke(`${name}.update`, id, input),
      },
    ])
  );

contextBridge.exposeInMainWorld("electronAPI", {
  backend: {
    auth: {
      login: (input) => ipcRenderer.invoke("auth.login", input),
      logout: () => ipcRenderer.invoke("auth.logout"),
      recover: (input) => ipcRenderer.invoke("auth.recover", input),
      setup: (input) => ipcRenderer.invoke("auth.setup", input),
      status: () => ipcRenderer.invoke("auth.status"),
    },
    collections: collectionBridge(),
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
