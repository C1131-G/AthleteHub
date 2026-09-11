"use client";

import { ArrowClockwiseIcon, DownloadSimpleIcon } from "@phosphor-icons/react";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useAppUpdate } from "@/lib/use-app-update";

/**
 * Sits in the sidebar footer, above Log out. Renders nothing until a new
 * release has actually finished downloading in the background (electron/ipc/
 * updates.cjs auto-downloads once it finds one) — a "checking"/"downloading"
 * row would just be noise the user can't act on yet.
 */
export const WorkspaceUpdateNotice = () => {
  const { available, install, status } = useAppUpdate();

  if (!available || status.state !== "ready") {
    return null;
  }

  const label = `Restart to install SSAIT Athlete360 ${status.version}`;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-label={label}
        render={
          <button aria-label={label} onClick={() => install()} type="button" />
        }
        tooltip={label}
      >
        <DownloadSimpleIcon aria-hidden="true" />
        <span>Update to v{status.version}</span>
        <ArrowClockwiseIcon aria-hidden="true" className="ml-auto size-4" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
