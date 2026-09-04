import { Suspense } from "react";

import { queryValue } from "@/features/assessment/assessment-routes";
import { AssessmentEditContent } from "@/features/assessment/components/assessment-edit-content";
import { AssessmentFormSkeleton } from "@/features/assessment/components/assessment-form";

export const metadata = { title: "Edit assessment" };

const EditAssessmentPage = ({
  params,
  searchParams,
}: PageProps<"/reports/assessments/[assessmentId]/edit">) => (
  <div className="space-y-2">
    <h1 className="text-2xl font-semibold tracking-tight">Edit assessment</h1>
    <p className="text-muted-foreground">
      Update the assessment while preserving its record history.
    </p>
    <Suspense fallback={<AssessmentFormSkeleton />}>
      {Promise.all([params, searchParams]).then(([route, query]) => (
        <AssessmentEditContent
          assessmentId={route.assessmentId}
          returnTo={queryValue(query.returnTo)}
        />
      ))}
    </Suspense>
  </div>
);

export default EditAssessmentPage;
