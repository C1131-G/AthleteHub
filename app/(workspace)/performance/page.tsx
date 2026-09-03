import { Suspense } from "react";

import { WorkspaceHeader } from "@/components/workspace-header";
import { PerformanceWorkspace } from "@/features/report/components/performance-workspace";

export const metadata = {
  description: "Compare athlete performance over time.",
  title: "Performance | AthleteHub",
};

const PerformancePage = () => (
  <>
    <WorkspaceHeader
      description="Compare score, volume, and progress across athletes."
      id="performance-title"
      title="Performance comparison"
    />
    <Suspense fallback={<p aria-live="polite">Loading performance data…</p>}>
      <PerformanceWorkspace />
    </Suspense>
  </>
);

export default PerformancePage;
