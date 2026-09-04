"use client";

import { WarningCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import type { MonthlyCycleStep } from "../monthly-cycle-types";
import { useCycleContext } from "../use-cycle-context";
import { ConditioningStep } from "./step-conditioning";
import { EquipmentStep } from "./step-equipment";
import { MonthlyAverageStep } from "./step-monthly-average";
import { ProfileStep } from "./step-profile";
import { ReviewStep } from "./step-review";
import { TrainingLoadStep } from "./step-training-load";
import { WeeklyStep } from "./step-weekly";

const unreachableStep = (step: never): never => step;

export const CycleStepSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-live="polite">
    <div className="bg-muted h-10 w-72 animate-pulse rounded-xl" />
    <div className="bg-muted h-64 animate-pulse rounded-2xl" />
    <div className="bg-muted h-40 animate-pulse rounded-2xl" />
  </div>
);

/**
 * Shared gate for every step route: waits for the stores, resolves the cycle
 * and its domain context, then renders the step. Direct links to a step stay
 * valid, and an unknown cycle shows a clear not-found state.
 */
export const CycleStepGate = ({
  cycleId,
  step,
}: {
  cycleId: string;
  step: MonthlyCycleStep;
}) => {
  const { context, cycle, ready, view } = useCycleContext(cycleId);

  if (!ready) {
    return <CycleStepSkeleton />;
  }
  if (!cycle || !context || !view) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WarningCircleIcon />
          </EmptyMedia>
          <EmptyTitle>Monthly cycle not found</EmptyTitle>
          <EmptyDescription>
            This cycle may have been removed or the link is incorrect.
          </EmptyDescription>
          <Link className={buttonVariants()} href="/monthly-cycles">
            Back to monthly cycles
          </Link>
        </EmptyHeader>
      </Empty>
    );
  }

  switch (step) {
    case "profile": {
      return (
        <ProfileStep
          context={context}
          cycle={cycle}
          status={view.steps.profile.status}
        />
      );
    }
    case "equipment": {
      return (
        <EquipmentStep
          context={context}
          cycle={cycle}
          stepView={view.steps.equipment}
        />
      );
    }
    case "weekly": {
      return (
        <WeeklyStep
          context={context}
          cycle={cycle}
          stepView={view.steps.weekly}
        />
      );
    }
    case "monthly-average": {
      return (
        <MonthlyAverageStep
          context={context}
          cycle={cycle}
          stepView={view.steps["monthly-average"]}
        />
      );
    }
    case "training-load": {
      return (
        <TrainingLoadStep
          context={context}
          cycle={cycle}
          stepView={view.steps["training-load"]}
        />
      );
    }
    case "conditioning": {
      return (
        <ConditioningStep
          context={context}
          cycle={cycle}
          stepView={view.steps.conditioning}
        />
      );
    }
    case "review": {
      return <ReviewStep context={context} cycle={cycle} />;
    }
    // oxlint-disable-next-line eslint(no-unreachable)
    default: {
      return unreachableStep(step);
    }
  }
};
