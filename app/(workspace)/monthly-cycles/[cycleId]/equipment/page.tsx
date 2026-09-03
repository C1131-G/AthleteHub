import { Suspense } from "react";

import {
  CycleStepGate,
  CycleStepSkeleton,
} from "@/features/monthly-cycle/components/cycle-step-gate";

export const metadata = {
  description: "Equipment step of the guided monthly cycle.",
  title: "Equipment | Monthly cycle | AthleteHub",
};

const Page = ({ params }: { params: Promise<{ cycleId: string }> }) => (
  <Suspense fallback={<CycleStepSkeleton />}>
    {params.then(({ cycleId }) => (
      <CycleStepGate cycleId={cycleId} step="equipment" />
    ))}
  </Suspense>
);

export default Page;
