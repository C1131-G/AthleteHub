import { Suspense } from "react";

import {
  AssessmentPreview,
  AssessmentSkeleton,
} from "@/features/assessment/components/assessment-preview";

export const metadata = { title: "Assessment | AthleteHub" };

const AssessmentPage = ({
  params,
}: PageProps<"/reports/assessments/[assessmentId]">) => (
  <div className="space-y-2">
    <h1 className="text-2xl font-semibold tracking-tight">Assessment</h1>
    <p className="text-muted-foreground">
      Review the recorded assessment and its date.
    </p>
    <Suspense fallback={<AssessmentSkeleton />}>
      {params.then(({ assessmentId }) => (
        <AssessmentPreview assessmentId={assessmentId} />
      ))}
    </Suspense>
  </div>
);

export default AssessmentPage;
