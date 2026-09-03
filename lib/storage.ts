/**
 * localStorage throws, not just returns null: a browser with site data blocked,
 * a private window, or a full quota all raise on access. Every read and write
 * goes through here so one of those never takes the app down.
 */
const store = (): Storage | undefined => {
  try {
    // Reading the property itself throws when site data is blocked.
    return globalThis.localStorage ?? undefined;
  } catch {
    return undefined;
  }
};

export const readStoredArray = (key: string): unknown[] => {
  try {
    const raw = store()?.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export class StorageWriteError extends Error {
  constructor(key: string) {
    super(
      `Could not save data for ${key}. Check available browser storage and try again.`
    );
    this.name = "StorageWriteError";
  }
}

/** Returns false when the value could not be persisted, never throws. */
export const writeStored = (key: string, value: unknown) => {
  try {
    const target = store();
    if (!target) {
      return false;
    }
    target.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
