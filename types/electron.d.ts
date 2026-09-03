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

interface Window {
  electronAPI?: {
    backend: { auth: ElectronAuthApi };
    platform: string;
  };
}
