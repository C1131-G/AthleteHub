import type {
  ArcherySession,
  SessionMutationResult,
} from "../features/session/session-types";

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

interface ElectronSessionsApi {
  complete: (input: unknown) => Promise<SessionMutationResult>;
  get: (sessionId: string) => Promise<ArcherySession | undefined>;
  listByAthlete: (athleteId: string) => Promise<ArcherySession[]>;
  saveDraft: (input: unknown) => Promise<SessionMutationResult>;
}

declare global {
  interface Window {
    electronAPI?: {
      backend: { auth: ElectronAuthApi; sessions: ElectronSessionsApi };
      platform: string;
    };
  }
}
