import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Suspense } from "react";

import { buttonVariants } from "@/components/ui/button";
import { WorkspaceHeader } from "@/components/workspace-header";
import { assessmentNewHref } from "@/features/assessment/assessment-routes";
import {
  ReportsWorkspace,
  ReportsWorkspaceSkeleton,
} from "@/features/report/components/reports-workspace";

export const metadata = {
  description: "Create and review weekly and monthly athlete reports.",
  title: "Reports",
};

const ReportsPage = () => (
  <>
    <WorkspaceHeader
      actions={
        <>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/reports/monthly/new"
          >
            <PlusIcon /> Monthly report
          </Link>
          <Link className={buttonVariants()} href="/reports/weekly/new">
            <PlusIcon /> Weekly entry
          </Link>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={assessmentNewHref()}
          >
            <PlusIcon /> Assessment
          </Link>
        </>
      }
      description="Enter weekly scores and review monthly coaching reports."
      id="reports-title"
      title="Performance reports"
    />
    <Suspense fallback={<ReportsWorkspaceSkeleton />}>
      <ReportsWorkspace />
    </Suspense>
  </>
);

export default ReportsPage;
