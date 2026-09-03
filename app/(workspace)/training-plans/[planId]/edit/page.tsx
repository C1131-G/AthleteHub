import { Suspense } from "react";

import { TrainingPlanForm } from "@/features/training-plan/components/training-plan-form";
import { TrainingPlanSkeleton } from "@/features/training-plan/components/training-plan-parts";

export const metadata = { title: "Edit training plan | AthleteHub" };

const EditTrainingPlanPage = ({
  params,
}: PageProps<"/training-plans/[planId]/edit">) => (
  <Suspense fallback={<TrainingPlanSkeleton />}>
    {params.then(({ planId }) => (
      <TrainingPlanForm planId={planId} />
    ))}
  </Suspense>
);

export default EditTrainingPlanPage;
