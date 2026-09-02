"use client";

import { useEffect } from "react";

import { hydrateEquipment } from "@/features/equipment/equipment-store";
import { hydrateReports } from "@/features/report/report-store";

import { hydrateAthletes } from "../athlete-store";

/**
 * Every store reads localStorage, which does not exist while rendering on the
 * server, so the first read happens once the shell has mounted.
 */
export const StoreHydrator = () => {
  useEffect(() => {
    hydrateAthletes();
    hydrateEquipment();
    hydrateReports();
  }, []);

  return null;
};
