import { Store } from "@tanstack/store";

import { trainingPlanRepository } from "./training-plan-repository";
import type {
  SeasonTrainingPlan,
  SeasonTrainingPlanInput,
} from "./training-plan-types";

interface TrainingPlanState {
  plans: SeasonTrainingPlan[];
  ready: boolean;
}

/** Shared training-plan state; see the note on athleteStore for the split. */
export const trainingPlanStore = new Store<TrainingPlanState>({
  plans: [],
  ready: false,
});

export const hydrateTrainingPlans = () => {
  trainingPlanStore.setState(() => ({
    plans: trainingPlanRepository.list(),
    ready: true,
  }));
};

const commit = () => {
  trainingPlanStore.setState((state) => ({
    ...state,
    plans: trainingPlanRepository.list(),
  }));
};

export const createTrainingPlan = (input: SeasonTrainingPlanInput) => {
  const result = trainingPlanRepository.create(input);
  if (result.status === "saved") {
    commit();
  }
  return result;
};

export const updateTrainingPlan = (
  planId: string,
  input: SeasonTrainingPlanInput
) => {
  const result = trainingPlanRepository.update(planId, input);
  if (result.status === "saved") {
    commit();
  }
  return result;
};
