"use client";

import { useStore } from "@tanstack/react-store";

import { useHydrated } from "@/hooks/use-hydrated";

import {
  createTrainingPlan,
  trainingPlanStore,
  updateTrainingPlan,
} from "./training-plan-store";

export const useTrainingPlans = () => {
  const { plans, ready } = useStore(trainingPlanStore);
  const hydrated = useHydrated();
  // Readers must not see stored plans until the client has hydrated, or the
  // first client render disagrees with the server HTML.
  const visible = ready && hydrated ? plans : [];

  return {
    createPlan: createTrainingPlan,
    getPlan: (planId: string) => visible.find((plan) => plan.id === planId),
    listByAthlete: (athleteId: string) =>
      visible.filter((plan) => plan.athleteId === athleteId),
    plans: visible,
    ready: ready && hydrated,
    updatePlan: updateTrainingPlan,
  };
};
