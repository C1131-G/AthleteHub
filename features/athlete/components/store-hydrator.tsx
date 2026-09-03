"use client";

import { useEffect } from "react";

import { hydrateAssessments } from "@/features/assessment/assessment-store";
import { hydrateConditioning } from "@/features/conditioning/conditioning-store";
import { hydrateEquipment } from "@/features/equipment/equipment-store";
import { hydrateMonthlyCycles } from "@/features/monthly-cycle/monthly-cycle-store";
import { hydrateReports } from "@/features/report/report-store";
import { hydrateTrainingPlans } from "@/features/training-plan/training-plan-store";

import { hydrateAthletes } from "../athlete-store";

const hydrateStoresOnMount = () => {
  hydrateAthletes();
  hydrateAssessments();
  hydrateConditioning();
  hydrateEquipment();
  hydrateMonthlyCycles();
  hydrateReports();
  hydrateTrainingPlans();
};

/**
 * Every store reads localStorage, which does not exist while rendering on the
 * server, so the first read happens once the shell has mounted.
 */
export const StoreHydrator = () => {
  useEffect(hydrateStoresOnMount, []);

  return null;
};
