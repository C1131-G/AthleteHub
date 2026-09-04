import { Suspense } from "react";

import { WorkspaceHeader } from "@/components/workspace-header";
import { CycleQueue } from "@/features/monthly-cycle/components/cycle-queue";
import { CycleQueueSkeleton } from "@/features/monthly-cycle/components/cycle-queue-skeleton";

export const metadata = {
  description: "Run every athlete through the guided monthly cycle.",
  title: "Monthly cycle",
};

const MonthlyCyclesPage = () => (
  <>
    <WorkspaceHeader
      description="Pick a month, then work every active athlete through profile, equipment, weekly reports, averages, plans, and conditioning."
      id="monthly-cycles-title"
      title="Monthly cycle"
    />
    <Suspense fallback={<CycleQueueSkeleton />}>
      <CycleQueue />
    </Suspense>
  </>
);

export default MonthlyCyclesPage;
