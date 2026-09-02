import { Store } from "@tanstack/store";

import { athleteRepository } from "./athlete-repository";
import type { Athlete, AthleteInput } from "./athlete-types";

interface AthleteState {
  athletes: Athlete[];
  ready: boolean;
}

/**
 * Shared athlete state. The repository is the localStorage boundary; this store
 * is the single in-memory copy every reader subscribes to, so a mutation from
 * any screen reaches all of them.
 */
export const athleteStore = new Store<AthleteState>({
  athletes: [],
  ready: false,
});

/** localStorage is unavailable during server rendering, so read after mount. */
export const hydrateAthletes = () => {
  athleteStore.setState(() => ({
    athletes: athleteRepository.list(),
    ready: true,
  }));
};

const commit = () => {
  athleteStore.setState((state) => ({
    ...state,
    athletes: athleteRepository.list(),
  }));
};

export const createAthlete = (input: AthleteInput) => {
  const athlete = athleteRepository.create(input);
  commit();
  return athlete;
};

export const updateAthlete = (id: string, input: AthleteInput) => {
  const athlete = athleteRepository.update(id, input);
  commit();
  return athlete;
};
