import { Suspense } from "react";

import {
  CycleStepGate,
  CycleStepSkeleton,
} from "@/features/monthly-cycle/components/cycle-step-gate";

export const metadata = {
  description: "Monthly average step of the guided monthly cycle.",
  title: "Monthly average | Monthly cycle | AthleteHub",
};

const Page = ({ params }: { params: Promise<{ cycleId: string }> }) => (
  <div>
    <h1 className="text-3xl font-semibold tracking-tight">Monthly average</h1>
    <Suspense fallback={<CycleStepSkeleton />}>
      {params.then(({ cycleId }) => (
        <CycleStepGate cycleId={cycleId} step="monthly-average" />
      ))}
    </Suspense>
  </div>
);

export default Page;
