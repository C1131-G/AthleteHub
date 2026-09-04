import { Suspense } from "react";

import {
  WeeklyReportForm,
  WeeklyReportFormSkeleton,
} from "@/features/report/components/weekly-report-form";

export const metadata = { title: "Edit weekly report" };

const EditWeeklyReportPage = ({
  params,
}: PageProps<"/reports/weekly/[reportId]/edit">) => (
  <Suspense fallback={<WeeklyReportFormSkeleton />}>
    {params.then(({ reportId }) => (
      <WeeklyReportForm reportId={reportId} />
    ))}
  </Suspense>
);

export default EditWeeklyReportPage;
