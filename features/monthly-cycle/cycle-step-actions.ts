import { updateCycle } from "./monthly-cycle-store";
import type {
  MonthlyAthleteCycle,
  MonthlyCycleState,
  MonthlyCycleStep,
  MonthlyCycleStepState,
} from "./monthly-cycle-types";

export type ConfirmStepState = Omit<MonthlyCycleStepState, "confirmedAt">;

const timestamp = () => new Date().toISOString();

/**
 * Persists one step's confirmation and advances the cycle's bookkeeping. The
 * cycle completes only through the review step.
 */
export const confirmCycleStep = (
  cycle: MonthlyAthleteCycle,
  step: MonthlyCycleStep,
  state: ConfirmStepState
) => {
  const steps = { ...cycle.steps };
  steps[step] = { ...state, confirmedAt: timestamp() };
  const finished = step === "review" && state.status === "complete";
  let status: MonthlyCycleState = cycle.status;
  if (finished) {
    status = "complete";
  } else if (cycle.status === "not-started") {
    status = "in-progress";
  }
  return updateCycle(cycle.id, {
    athleteId: cycle.athleteId,
    completedAt: finished ? timestamp() : cycle.completedAt,
    lastVisitedStep: step,
    month: cycle.month,
    status,
    steps,
  });
};
