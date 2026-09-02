import {
  afterEach as bunAfterEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { readStoredArray, writeStored } from "./storage";

const original = globalThis.localStorage;

bunAfterEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: original,
  });
});

const useStorage = (value: unknown) => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => {
      if (value === "throws") {
        throw new Error("site data blocked");
      }
      return value;
    },
  });
};

bunDescribe("guarded storage", () => {
  bunTest("returns an empty array when access throws", () => {
    useStorage("throws");
    bunExpect(readStoredArray("any-key")).toEqual([]);
  });

  bunTest("returns an empty array for malformed JSON", () => {
    useStorage({ getItem: () => "{not json" });
    bunExpect(readStoredArray("any-key")).toEqual([]);
  });

  bunTest("returns an empty array when the value is not an array", () => {
    useStorage({ getItem: () => '{"a":1}' });
    bunExpect(readStoredArray("any-key")).toEqual([]);
  });

  bunTest("reports failure instead of throwing when the quota is full", () => {
    useStorage({
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    bunExpect(writeStored("any-key", [1])).toBe(false);
  });
});
