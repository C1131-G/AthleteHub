"use client";

import type { ListOptions } from "@/electron/collections";
import { collectionSchemas } from "@/features/backend/collection-services";
import { useCollection } from "@/lib/use-collection";

export const useTrainingPlans = (options?: ListOptions) => {
  const { create, ready, records, ...rest } = useCollection(
    "trainingPlans",
    collectionSchemas.trainingPlans,
    options
  );

  return {
    archivePlan: rest.archive,
    createPlan: create,
    getPlan: (planId: string) => records.find((plan) => plan.id === planId),
    listByAthlete: (athleteId: string) =>
      records.filter((plan) => plan.athleteId === athleteId),
    plans: records,
    ready,
    restorePlan: rest.restore,
    updatePlan: rest.update,
  };
};
