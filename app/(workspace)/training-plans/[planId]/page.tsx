import { Suspense } from "react";

import {
  TrainingPlanPreview,
  TrainingPlanPreviewSkeleton,
} from "@/features/training-plan/components/training-plan-preview";

export const metadata = { title: "Training plan | AthleteHub" };

const TrainingPlanPage = ({
  params,
}: PageProps<"/training-plans/[planId]">) => (
  <Suspense fallback={<TrainingPlanPreviewSkeleton />}>
    {params.then(({ planId }) => (
      <TrainingPlanPreview planId={planId} />
    ))}
  </Suspense>
);

export default TrainingPlanPage;
