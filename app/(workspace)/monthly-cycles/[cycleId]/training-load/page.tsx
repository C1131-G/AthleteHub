import { Suspense } from "react";

import {
  CycleStepGate,
  CycleStepSkeleton,
} from "@/features/monthly-cycle/components/cycle-step-gate";

export const metadata = {
  description: "Training load step of the guided monthly cycle.",
  title: "Training load | Monthly cycle | AthleteHub",
};

const Page = ({ params }: { params: Promise<{ cycleId: string }> }) => (
  <Suspense fallback={<CycleStepSkeleton />}>
    {params.then(({ cycleId }) => (
      <CycleStepGate cycleId={cycleId} step="training-load" />
    ))}
  </Suspense>
);

export default Page;
