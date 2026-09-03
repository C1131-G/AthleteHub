import { Suspense } from "react";

import { queryValue } from "@/features/assessment/assessment-routes";
import {
  AssessmentForm,
  AssessmentFormSkeleton,
} from "@/features/assessment/components/assessment-form";

export const metadata = { title: "New assessment | AthleteHub" };

const NewAssessmentPage = ({
  searchParams,
}: PageProps<"/reports/assessments/new">) => (
  <div className="space-y-2">
    <h1 className="text-2xl font-semibold tracking-tight">New assessment</h1>
    <p className="text-muted-foreground">
      Record a dated assessment for an athlete.
    </p>
    <Suspense fallback={<AssessmentFormSkeleton />}>
      {searchParams.then((params) => (
        <AssessmentForm
          initialAthleteId={queryValue(params.athleteId)}
          initialDate={queryValue(params.assessedOn)}
          returnTo={queryValue(params.returnTo)}
        />
      ))}
    </Suspense>
  </div>
);

export default NewAssessmentPage;
