import { Suspense } from "react";

import {
  DashboardWorkspace,
  DashboardWorkspaceSkeleton,
} from "@/features/report/components/dashboard-workspace";

export const metadata = {
  description: "Review team performance and reporting progress.",
  title: "Dashboard | AthleteHub",
};

const DashboardPage = () => (
  <Suspense fallback={<DashboardWorkspaceSkeleton />}>
    <DashboardWorkspace />
  </Suspense>
);

export default DashboardPage;
