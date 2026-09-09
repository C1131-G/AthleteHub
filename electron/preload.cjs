const { contextBridge, ipcRenderer } = require("electron");

const COLLECTION_NAMES = [
  "assessments",
  "athletes",
  "conditioningAssessments",
  "conditioningProgrammes",
  "equipment",
  "monthlyCycles",
  "monthlyReports",
  "sightMarks",
  "trainingPlans",
  "wellness",
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
      changePassword: (input) =>
        ipcRenderer.invoke("auth.changePassword", input),
      login: (input) => ipcRenderer.invoke("auth.login", input),
      logout: () => ipcRenderer.invoke("auth.logout"),
      recover: (input) => ipcRenderer.invoke("auth.recover", input),
      setup: (input) => ipcRenderer.invoke("auth.setup", input),
      status: () => ipcRenderer.invoke("auth.status"),
    },
    collections: collectionBridge(),
    location: {
      choose: () => ipcRenderer.invoke("location.choose"),
      setup: (input) => ipcRenderer.invoke("location.setup", input),
      status: () => ipcRenderer.invoke("location.status"),
      update: (input) => ipcRenderer.invoke("location.update", input),
    },
    photos: {
      read: (name) => ipcRenderer.invoke("photos.read", name),
      save: (input) => ipcRenderer.invoke("photos.save", input),
    },
    preferences: {
      read: () => ipcRenderer.invoke("preferences.read"),
      write: (partial) => ipcRenderer.invoke("preferences.write", partial),
    },
    sessions: {
      complete: (input) => ipcRenderer.invoke("sessions.complete", input),
      get: (sessionId) => ipcRenderer.invoke("sessions.get", sessionId),
      listAll: () => ipcRenderer.invoke("sessions.listAll"),
      listByAthlete: (athleteId) =>
        ipcRenderer.invoke("sessions.listByAthlete", athleteId),
      saveDraft: (input) => ipcRenderer.invoke("sessions.saveDraft", input),
    },
    update: {
      check: () => ipcRenderer.invoke("update.check"),
      install: () => ipcRenderer.invoke("update.install"),
      // Returns an unsubscribe function rather than exposing ipcRenderer
      // itself, so the renderer never touches the raw event emitter.
      onChange: (listener) => {
        const handler = (_event, status) => listener(status);
        ipcRenderer.on("update.changed", handler);
        return () => ipcRenderer.removeListener("update.changed", handler);
      },
      status: () => ipcRenderer.invoke("update.status"),
    },
  },
  // Only used by the local login page; the main process rejects this channel
  // from any other renderer and for any non-whitelisted destination.
  desktop: {
    continueToApp: (destination) =>
      ipcRenderer.invoke("app.continue", destination),
  },
  platform: process.platform,
});
