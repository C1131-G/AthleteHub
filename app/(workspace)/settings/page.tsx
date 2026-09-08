import type { Metadata } from "next";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { BackupPanel } from "@/features/backend/components/backup-panel";
import { PreferencesPanel } from "@/features/backend/components/preferences-panel";
import { StoragePanel } from "@/features/backend/components/storage-panel";

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
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Appearance</h2>
      <ThemeSwitcher />
    </div>
    <PreferencesPanel />
    <StoragePanel />
    <BackupPanel />
  </div>
);

export default SettingsPage;
