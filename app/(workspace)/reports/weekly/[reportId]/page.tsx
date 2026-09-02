import { Suspense } from "react";

import {
  WeeklyReportPreview,
  WeeklyReportPreviewSkeleton,
} from "@/features/report/components/weekly-report-preview";

export const metadata = { title: "Weekly report | AthleteHub" };

const WeeklyReportPage = ({
  params,
}: PageProps<"/reports/weekly/[reportId]">) => (
  <Suspense fallback={<WeeklyReportPreviewSkeleton />}>
    {params.then(({ reportId }) => (
      <WeeklyReportPreview reportId={reportId} />
    ))}
  </Suspense>
);

export default WeeklyReportPage;
