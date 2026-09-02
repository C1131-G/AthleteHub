import { Suspense } from "react";

import {
  MonthlyReportPreview,
  MonthlyReportPreviewSkeleton,
} from "@/features/report/components/monthly-report-preview";

export const metadata = { title: "Monthly report | AthleteHub" };

const MonthlyReportPage = ({
  params,
}: PageProps<"/reports/monthly/[reportId]">) => (
  <Suspense fallback={<MonthlyReportPreviewSkeleton />}>
    {params.then(({ reportId }) => (
      <MonthlyReportPreview reportId={reportId} />
    ))}
  </Suspense>
);

export default MonthlyReportPage;
