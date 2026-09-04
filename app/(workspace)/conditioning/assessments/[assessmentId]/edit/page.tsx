import { Suspense } from "react";

import {
  AssessmentForm,
  AssessmentFormSkeleton,
} from "@/features/conditioning/components/assessment-form";

export const metadata = { title: "Edit assessment" };

const EditAssessmentPage = ({
  params,
}: PageProps<"/conditioning/assessments/[assessmentId]/edit">) => (
  <Suspense fallback={<AssessmentFormSkeleton />}>
    {params.then(({ assessmentId }) => (
      <AssessmentForm assessmentId={assessmentId} />
    ))}
  </Suspense>
);

export default EditAssessmentPage;
