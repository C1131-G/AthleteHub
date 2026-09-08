import type { ListOptions } from "../electron/collections";
import type {
  CollectionName,
  CollectionRecordMap,
} from "../features/backend/collection-services";
import type {
  ArcherySession,
  SessionMutationResult,
} from "../features/session/session-types";
import type { CollectionMutationResult } from "../lib/collection-service";

/**
 * Every migrated collection exposes this surface. Responses still cross a
 * process boundary, so the hooks parse them before they reach the cache.
 */
interface ElectronCollectionApi<TRecord> {
  archive: (id: string) => Promise<CollectionMutationResult<TRecord>>;
  create: (input: unknown) => Promise<CollectionMutationResult<TRecord>>;
  get: (id: string) => Promise<TRecord | undefined>;
  importRecord: (record: unknown) => Promise<CollectionMutationResult<TRecord>>;
  list: (options?: ListOptions) => Promise<TRecord[]>;
  restore: (id: string) => Promise<CollectionMutationResult<TRecord>>;
  update: (
    id: string,
    input: unknown
  ) => Promise<CollectionMutationResult<TRecord>>;
}

type ElectronCollectionsApi = {
  [TName in CollectionName]: ElectronCollectionApi<CollectionRecordMap[TName]>;
};

interface ElectronAuthApi {
  login: (input: {
    password: string;
    username: string;
  }) => Promise<{ authenticated: true; recoveryCode: string }>;
  logout: () => Promise<void>;
  recover: (input: {
    newPassword: string;
    recoveryCode: string;
    username: string;
  }) => Promise<{ authenticated: true }>;
  setup: (input: {
    password: string;
    username: string;
  }) => Promise<{ recoveryCode: string }>;
  status: () => Promise<{ authenticated: boolean; configured: boolean }>;
}

export interface AppPreferences {
  backupCount: number;
  rankingDistance: number;
  weekStartsOn: 0 | 1 | 6;
}

interface ElectronPhotosApi {
  read: (name: string) => Promise<string>;
  save: (input: { athleteId: string; dataUrl: string }) => Promise<string>;
}

interface ElectronPreferencesApi {
  read: () => Promise<AppPreferences>;
  write: (partial: Partial<AppPreferences>) => Promise<AppPreferences>;
}

export interface LocationStatus {
  backupPath: string | null;
  configured: boolean;
  storagePath: string | null;
}

interface ElectronLocationApi {
  choose: () => Promise<string | null>;
  setup: (input: {
    backupPath: string;
    storagePath: string;
  }) => Promise<{ backupPath: string; storagePath: string }>;
  status: () => Promise<LocationStatus>;
  update: (input: {
    backupPath?: string;
    password: string;
    storagePath?: string;
  }) => Promise<{ restarting: true }>;
}

interface ElectronSessionsApi {
  complete: (input: unknown) => Promise<SessionMutationResult>;
  get: (sessionId: string) => Promise<ArcherySession | undefined>;
  listAll: () => Promise<ArcherySession[]>;
  listByAthlete: (athleteId: string) => Promise<ArcherySession[]>;
  saveDraft: (input: unknown) => Promise<SessionMutationResult>;
}

declare global {
  interface Window {
    electronAPI?: {
      backend: {
        auth: ElectronAuthApi;
        collections: ElectronCollectionsApi;
        location: ElectronLocationApi;
        photos: ElectronPhotosApi;
        preferences: ElectronPreferencesApi;
        sessions: ElectronSessionsApi;
      };
      platform: string;
    };
  }
}
