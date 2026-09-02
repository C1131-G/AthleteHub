"use client";

import { UsersThreeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";

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
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { AthleteProvider } from "./athlete-provider";

interface AthleteShellClientProps {
  backLink: ReactNode;
  children: ReactNode;
}

export const AthleteShellClient = ({
  backLink,
  children,
}: AthleteShellClientProps) => {
  return (
    <AthleteProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
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
                  <SidebarMenuItem>
                    <Link
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-9 w-full items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-left text-sm outline-hidden transition-[width,height,padding] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! focus-visible:ring-2"
                      href="/athletes"
                      title="Athletes"
                    >
                      <UsersThreeIcon aria-hidden="true" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        Athletes
                      </span>
                    </Link>
                  </SidebarMenuItem>
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
        <SidebarInset className="min-h-svh overflow-hidden">
          <header className="bg-background/95 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            {backLink}
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AthleteProvider>
  );
};
