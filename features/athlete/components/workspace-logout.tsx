"use client";

import { SignOutIcon } from "@phosphor-icons/react";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { CYCLE_NAVIGATION_REQUEST } from "@/lib/cycle-navigation";
import { desktopAuth } from "@/lib/desktop-auth";

const performLogout = async () => {
  await desktopAuth()?.logout();
  window.location.replace("/login");
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

export const WorkspaceLogout = () => (
  <SidebarMenuItem>
    <SidebarMenuButton
      aria-label="Log out"
      render={<button aria-label="Log out" onClick={logout} type="button" />}
      tooltip="Log out"
    >
      <SignOutIcon aria-hidden="true" />
      <span>Log out</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
);
