"use client";

import "../types/electron";
import type {
  CollectionName,
  CollectionRecordMap,
} from "../features/backend/collection-services";
import { createCollectionServices } from "../features/backend/collection-services";
import { createSessionService } from "../features/session/session-service";
import type { SessionService } from "../features/session/session-service";
import type { CollectionService } from "./collection-service";
import { createLocalCollections } from "./local-collections";
import { createLocalSessions } from "./local-sessions";

let fallback: ReturnType<typeof createCollectionServices> | undefined;

/**
 * Built once and kept, so every hook shares one localStorage-backed instance
 * during browser development.
 */
const localServices = () => {
  fallback ??= createCollectionServices(createLocalCollections());
  return fallback;
};

/** Every collection keyed to the record it holds. */
export type CollectionClients = {
  [TName in CollectionName]: CollectionService<CollectionRecordMap[TName]>;
};

/**
 * The desktop app reaches SQLite through the main process; a plain browser
 * falls back to localStorage running the very same service code.
 */
const clients = (): CollectionClients =>
  globalThis.window?.electronAPI?.backend.collections ?? localServices();

export const collectionClient = <TName extends CollectionName>(name: TName) =>
  clients()[name];

let fallbackSessions: SessionService | undefined;

/**
 * Sessions reach the database through their own accessor rather than the
 * collection interface, so they get the same treatment separately: IPC in the
 * desktop app, localStorage running the same service in a browser.
 */
export const sessionClient = (): SessionService => {
  const bridge = globalThis.window?.electronAPI?.backend.sessions;
  if (bridge) {
    return bridge;
  }
  fallbackSessions ??= createSessionService(createLocalSessions());
  return fallbackSessions;
};

export const isDesktopBackend = () =>
  Boolean(globalThis.window?.electronAPI?.backend.collections);
