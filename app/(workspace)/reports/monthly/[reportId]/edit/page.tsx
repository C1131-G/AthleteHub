import { Suspense } from "react";

import {
  MonthlyReportForm,
  MonthlyReportFormSkeleton,
} from "@/features/report/components/monthly-report-form";

export const metadata = { title: "Edit monthly report | AthleteHub" };

const EditMonthlyReportPage = ({
  params,
}: PageProps<"/reports/monthly/[reportId]/edit">) => (
  <Suspense fallback={<MonthlyReportFormSkeleton />}>
    {params.then(({ reportId }) => (
      <MonthlyReportForm reportId={reportId} />
    ))}
  </Suspense>
);

export default EditMonthlyReportPage;
