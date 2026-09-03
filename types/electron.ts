import type {
  ArcherySession,
  SessionMutationResult,
} from "../features/session/session-types";

interface ElectronAuthApi {
  login: (input: {
    email: string;
    password: string;
  }) => Promise<{ authenticated: true }>;
  logout: () => Promise<void>;
  recover: (input: {
    email: string;
    newPassword: string;
    recoveryCode: string;
  }) => Promise<{ authenticated: true }>;
  setup: (input: {
    email: string;
    password: string;
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
