import { Suspense } from "react";

import {
  AssessmentPreview,
  AssessmentPreviewSkeleton,
} from "@/features/conditioning/components/assessment-preview";

export const metadata = { title: "Assessment | AthleteHub" };

const AssessmentPage = ({
  params,
}: PageProps<"/conditioning/assessments/[assessmentId]">) => (
  <Suspense fallback={<AssessmentPreviewSkeleton />}>
    {params.then(({ assessmentId }) => (
      <AssessmentPreview assessmentId={assessmentId} />
    ))}
  </Suspense>
);

export default AssessmentPage;
