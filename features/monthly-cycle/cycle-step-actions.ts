"use client";

import type { CollectionMutationResult } from "@/lib/collection-service";

import type {
  MonthlyAthleteCycle,
  MonthlyCycleState,
  MonthlyCycleStep,
  MonthlyCycleStepState,
} from "./monthly-cycle-types";
import { useMonthlyCycles } from "./use-monthly-cycles";

export type ConfirmStepState = Omit<MonthlyCycleStepState, "confirmedAt">;

export type ConfirmCycleStep = (
  cycle: MonthlyAthleteCycle,
  step: MonthlyCycleStep,
  state: ConfirmStepState
) => Promise<CollectionMutationResult<MonthlyAthleteCycle>>;

const timestamp = () => new Date().toISOString();

/**
 * Persists one step's confirmation and advances the cycle's bookkeeping. The
 * cycle completes only through the review step.
 *
 * A hook rather than a plain function because the write now goes through the
 * cycle service, which the hook layer resolves per environment.
 */
export const useConfirmCycleStep = (): ConfirmCycleStep => {
  const { updateCycle } = useMonthlyCycles();

  return async (cycle, step, state) => {
    const steps = { ...cycle.steps };
    steps[step] = { ...state, confirmedAt: timestamp() };
    const finished = step === "review" && state.status === "complete";
    let status: MonthlyCycleState = cycle.status;
    if (finished) {
      status = "complete";
    } else if (cycle.status === "not-started") {
      status = "in-progress";
    }
    return await updateCycle(cycle.id, {
      athleteId: cycle.athleteId,
      completedAt: finished ? timestamp() : cycle.completedAt,
      lastVisitedStep: step,
      month: cycle.month,
      status,
      steps,
    });
  };
};
