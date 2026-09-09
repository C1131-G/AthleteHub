"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { CommandPalette } from "@/components/command-palette";
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
import { TooltipProvider } from "@/components/ui/tooltip";

import { MAIN_CONTENT_ID, RouteFocus } from "./route-focus";
import { RouteTransition } from "./route-transition";
import { StoreHydrator } from "./store-hydrator";
import { WorkspaceLogout } from "./workspace-logout";
import {
  WorkspaceNavigation,
  WorkspaceNavigationSkeleton,
} from "./workspace-navigation";
import { WorkspaceUpdateNotice } from "./workspace-update-notice";

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
      {/* usePathname is dynamic, which a prerendered shell cannot resolve. */}
      {/* RouteFocus has no visible output; its null fallback avoids layout shift. */}
      <Suspense fallback={null}>
        <RouteFocus />
      </Suspense>
      <StoreHydrator />
      <TooltipProvider>
        <SidebarProvider>
          {/* Sidebar renders a div it owns, so the landmark comes from the role
            rather than a nav tag. Without it axe reports the sidebar header and
            footer as content outside any landmark. */}
          {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
          <Sidebar aria-label="Workspace" collapsible="icon" role="navigation">
            <a
              className="bg-background focus-visible:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:border focus:px-3 focus:py-2 focus:text-sm focus-visible:ring-2"
              href={`#${MAIN_CONTENT_ID}`}
            >
              Skip to main content
            </a>
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
              <SidebarMenu>
                <WorkspaceUpdateNotice />
                <WorkspaceLogout />
              </SidebarMenu>
            </SidebarFooter>
            <CommandPalette />
            <SidebarRail />
          </Sidebar>
          <SidebarInset className="h-dvh overflow-hidden">
            <header className="bg-background/95 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
              <SidebarTrigger className="-ml-1" />
              {backLink}
            </header>
            <main
              className="min-h-0 flex-1 overflow-y-auto focus-visible:outline-none"
              id={MAIN_CONTENT_ID}
              tabIndex={-1}
            >
              <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
                <RouteTransition>{children}</RouteTransition>
              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </>
  );
};
