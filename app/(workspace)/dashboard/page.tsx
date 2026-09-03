import Link from "next/link";
import { Suspense } from "react";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { buttonVariants } from "@/components/ui/button";
import { WorkspaceHeader } from "@/components/workspace-header";
import {
  DashboardWorkspace,
  DashboardWorkspaceSkeleton,
} from "@/features/report/components/dashboard-workspace";

export const metadata = {
  description: "Review team performance and reporting progress.",
  title: "Dashboard | AthleteHub",
};

const DashboardPage = () => (
  <>
    <WorkspaceHeader
      actions={
        <>
          <ThemeSwitcher />
          <Link className={buttonVariants()} href="/reports/weekly/new">
            Add weekly entry
          </Link>
        </>
      }
      description="A quick view of training, scores, and reports."
      id="dashboard-title"
      title="Performance dashboard"
    />
    <Suspense fallback={<DashboardWorkspaceSkeleton />}>
      <DashboardWorkspace />
    </Suspense>
  </>
);

export default DashboardPage;
