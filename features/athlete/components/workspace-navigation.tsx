"use client";

import {
  GaugeIcon,
  NotebookIcon,
  UsersThreeIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

interface NavigationItem {
  href: "/dashboard" | "/athletes" | "/athletes/equipment" | "/reports";
  icon: ComponentType<{ "aria-hidden"?: boolean }>;
  label: string;
}

const items: NavigationItem[] = [
  { href: "/dashboard", icon: GaugeIcon, label: "Dashboard" },
  { href: "/athletes", icon: UsersThreeIcon, label: "Athletes" },
  { href: "/athletes/equipment", icon: WrenchIcon, label: "Equipment" },
  { href: "/reports", icon: NotebookIcon, label: "Reports" },
];

export const WorkspaceNavigation = () => {
  const pathname = usePathname();
  return (
    <>
      {items.map(({ href, icon: Icon, label }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            aria-label={label}
            isActive={pathname === href || pathname.startsWith(`${href}/`)}
            render={<Link href={href} transitionTypes={["nav-forward"]} />}
            tooltip={label}
          >
            <Icon aria-hidden />
            <span>{label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
};

export const WorkspaceNavigationSkeleton = () => (
  <>
    {items.map(({ href, label }) => (
      <SidebarMenuItem key={href}>
        <SidebarMenuButton aria-label={label} render={<span />}>
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-20" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))}
  </>
);
