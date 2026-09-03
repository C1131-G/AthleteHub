import { Store } from "@tanstack/store";

import { monthlyCycleRepository } from "./monthly-cycle-repository";
import type {
  MonthlyAthleteCycle,
  MonthlyCycleInput,
  MonthlyCycleMutationResult,
} from "./monthly-cycle-types";

export interface MonthlyCycleState {
  cycles: MonthlyAthleteCycle[];
  ready: boolean;
}

export const monthlyCycleStore = new Store<MonthlyCycleState>({
  cycles: [],
  ready: false,
});

export const hydrateMonthlyCycles = () => {
  monthlyCycleStore.setState(() => ({
    cycles: monthlyCycleRepository.list(),
    ready: true,
  }));
};

const commit = (result: MonthlyCycleMutationResult) => {
  if (result.status === "saved") {
    monthlyCycleStore.setState(() => ({
      cycles: monthlyCycleRepository.list(),
      ready: true,
    }));
  }
  return result;
};

export const createCycle = (input: MonthlyCycleInput) =>
  commit(monthlyCycleRepository.create(input));

export const updateCycle = (cycleId: string, input: MonthlyCycleInput) =>
  commit(monthlyCycleRepository.update(cycleId, input));
