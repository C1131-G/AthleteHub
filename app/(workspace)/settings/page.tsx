import type { Metadata } from "next";

import { BackupPanel } from "@/features/backend/components/backup-panel";

export const metadata: Metadata = {
  title: "Settings",
};

const SettingsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-3xl font-semibold">Settings</h1>
      <p className="text-muted-foreground mt-2">
        AthleteHub stores everything on this device. Keep a backup somewhere
        else.
      </p>
    </div>
    <BackupPanel />
  </div>
);

export default SettingsPage;
