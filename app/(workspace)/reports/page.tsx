import { Suspense } from "react";

import {
  ReportsWorkspace,
  ReportsWorkspaceSkeleton,
} from "@/features/report/components/reports-workspace";

export const metadata = {
  description: "Create and review weekly and monthly athlete reports.",
  title: "Reports | AthleteHub",
};

const ReportsPage = () => (
  <Suspense fallback={<ReportsWorkspaceSkeleton />}>
    <ReportsWorkspace />
  </Suspense>
);

export default ReportsPage;
