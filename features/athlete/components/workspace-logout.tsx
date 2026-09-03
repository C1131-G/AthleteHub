"use client";

import { SignOutIcon } from "@phosphor-icons/react";

import { SidebarMenuButton } from "@/components/ui/sidebar";

export const WorkspaceLogout = () => (
  <div>
    <SidebarMenuButton
      aria-label="Log out"
      render={
        <button
          aria-label="Log out"
          onClick={() => window.location.replace("/login")}
          type="button"
        />
      }
      tooltip="Log out"
    >
      <SignOutIcon aria-hidden="true" />
      <span>Log out</span>
    </SidebarMenuButton>
  </div>
);
