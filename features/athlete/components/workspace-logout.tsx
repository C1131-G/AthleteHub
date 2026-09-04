"use client";

import { SignOutIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { CYCLE_NAVIGATION_REQUEST } from "@/lib/cycle-navigation";
import { desktopAuth } from "@/lib/desktop-auth";

export const WorkspaceLogout = () => {
  const [error, setError] = useState<string>();

  const performLogout = async () => {
    try {
      await desktopAuth()?.logout();
      window.location.replace("/login");
    } catch {
      setError("Could not log out. Your session is still active.");
    }
  };

  const logout = () => {
    const event = new CustomEvent(CYCLE_NAVIGATION_REQUEST, {
      cancelable: true,
      detail: performLogout,
    });
    if (window.dispatchEvent(event)) {
      void performLogout();
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-label="Log out"
        render={<button aria-label="Log out" onClick={logout} type="button" />}
        tooltip="Log out"
      >
        <SignOutIcon aria-hidden="true" />
        <span>Log out</span>
      </SidebarMenuButton>
      {error ? (
        <p className="text-destructive px-2 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </SidebarMenuItem>
  );
};
