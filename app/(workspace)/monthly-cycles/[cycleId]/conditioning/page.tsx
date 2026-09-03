import { Suspense } from "react";

import {
  CycleStepGate,
  CycleStepSkeleton,
} from "@/features/monthly-cycle/components/cycle-step-gate";

export const metadata = {
  description: "Conditioning step of the guided monthly cycle.",
  title: "Conditioning | Monthly cycle | AthleteHub",
};

const Page = ({ params }: { params: Promise<{ cycleId: string }> }) => (
  <Suspense fallback={<CycleStepSkeleton />}>
    {params.then(({ cycleId }) => (
      <CycleStepGate cycleId={cycleId} step="conditioning" />
    ))}
  </Suspense>
);

export default Page;
