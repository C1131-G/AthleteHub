"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { RouteTransition } from "./route-transition";
import { StoreHydrator } from "./store-hydrator";
import {
  WorkspaceNavigation,
  WorkspaceNavigationSkeleton,
} from "./workspace-navigation";

interface AthleteShellClientProps {
  backLink: ReactNode;
  children: ReactNode;
}

export const AthleteShellClient = ({
  backLink,
  children,
}: AthleteShellClientProps) => {
  return (
    <>
      <StoreHydrator />
      <SidebarProvider>
        {/* Sidebar renders a div it owns, so the landmark comes from the role
            rather than a nav tag. Without it axe reports the sidebar header and
            footer as content outside any landmark. */}
        {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
        <Sidebar aria-label="Workspace" collapsible="icon" role="navigation">
          <SidebarHeader className="h-14 justify-center">
            <Link
              className="truncate px-2 font-semibold group-data-[collapsible=icon]:hidden"
              href="/athletes"
            >
              AthleteHub
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <Suspense fallback={<WorkspaceNavigationSkeleton />}>
                    <WorkspaceNavigation />
                  </Suspense>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex justify-center group-data-[collapsible=icon]:hidden">
              <ThemeSwitcher />
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="h-dvh overflow-hidden">
          <header className="bg-background/95 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            {backLink}
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
              <RouteTransition>{children}</RouteTransition>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
};
