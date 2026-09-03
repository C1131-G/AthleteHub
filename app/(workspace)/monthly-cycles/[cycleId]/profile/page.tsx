import { Suspense } from "react";

import {
  CycleStepGate,
  CycleStepSkeleton,
} from "@/features/monthly-cycle/components/cycle-step-gate";

export const metadata = {
  description: "Athlete profile step of the guided monthly cycle.",
  title: "Athlete profile | Monthly cycle | AthleteHub",
};

const Page = ({ params }: { params: Promise<{ cycleId: string }> }) => (
  <Suspense fallback={<CycleStepSkeleton />}>
    {params.then(({ cycleId }) => (
      <CycleStepGate cycleId={cycleId} step="profile" />
    ))}
  </Suspense>
);

export default Page;
