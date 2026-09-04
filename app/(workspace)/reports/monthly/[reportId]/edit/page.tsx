import { Suspense } from "react";

import { MonthlyReportForm } from "@/features/report/components/monthly-report-form";
import { MonthlyReportFormSkeleton } from "@/features/report/components/monthly-report-form-skeleton";

export const metadata = { title: "Edit monthly report" };

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
