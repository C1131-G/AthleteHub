"use client";

import {
  BarbellIcon,
  CalendarIcon,
  GaugeIcon,
  GearIcon,
  NotebookIcon,
  TargetIcon,
  UsersThreeIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

interface NavigationItem {
  href:
    | "/dashboard"
    | "/athletes"
    | "/athletes/equipment"
    | "/conditioning"
    | "/monthly-cycles"
    | "/reports"
    | "/sessions"
    | "/settings"
    | "/training-plans";
  icon: ComponentType<{ "aria-hidden"?: boolean }>;
  label: string;
}

const items: NavigationItem[] = [
  { href: "/dashboard", icon: GaugeIcon, label: "Dashboard" },
  { href: "/monthly-cycles", icon: CalendarIcon, label: "Monthly Cycle" },
  { href: "/athletes", icon: UsersThreeIcon, label: "Athletes" },
  { href: "/athletes/equipment", icon: WrenchIcon, label: "Equipment" },
  { href: "/reports", icon: NotebookIcon, label: "Reports" },
  { href: "/sessions", icon: TargetIcon, label: "Sessions" },
  { href: "/conditioning", icon: BarbellIcon, label: "Conditioning" },
  { href: "/training-plans", icon: TargetIcon, label: "Training Load" },
  { href: "/settings", icon: GearIcon, label: "Settings" },
];

export const WorkspaceNavigation = () => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <>
      {items.map(({ href, icon: Icon, label }) => (
        <SidebarMenuItem key={href}>
          <SidebarMenuButton
            aria-label={label}
            isActive={isNavigationItemActive(pathname, href)}
            render={
              <Link
                href={href}
                aria-current={
                  isNavigationItemActive(pathname, href) ? "page" : undefined
                }
                onClick={() => {
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}
                transitionTypes={["nav-forward"]}
              />
            }
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

const isNavigationItemActive = (
  pathname: string,
  href: NavigationItem["href"]
) => {
  if (href === "/athletes") {
    return (
      pathname === href ||
      (pathname.startsWith("/athletes/") &&
        !pathname.startsWith("/athletes/equipment"))
    );
  }
  if (href === "/athletes/equipment") {
    return pathname === href || pathname.startsWith("/athletes/equipment/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

/**
 * Placeholders only. Labelling them would announce navigation that is not
 * there yet, and `aria-label` is prohibited on a span with no role.
 */
export const WorkspaceNavigationSkeleton = () => (
  <>
    {items.map(({ href }) => (
      <SidebarMenuItem aria-hidden="true" key={href}>
        <SidebarMenuButton render={<span />}>
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-20" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))}
  </>
);
