import { Suspense } from "react";

import {
  AssessmentForm,
  AssessmentFormSkeleton,
} from "@/features/conditioning/components/assessment-form";

export const metadata = { title: "New assessment | AthleteHub" };

const NewAssessmentPage = () => (
  <Suspense fallback={<AssessmentFormSkeleton />}>
    <AssessmentForm />
  </Suspense>
);

export default NewAssessmentPage;
