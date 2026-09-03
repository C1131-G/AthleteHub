"use client";

import { useStore } from "@tanstack/react-store";

import { useHydrated } from "@/hooks/use-hydrated";

import {
  createCycle,
  monthlyCycleStore,
  updateCycle,
} from "./monthly-cycle-store";

/**
 * Cycle data lives in localStorage, so the store is empty until the workspace
 * shell has mounted and hydrated; `ready` is false until then.
 */
export const useMonthlyCycles = () => {
  const { cycles, ready } = useStore(monthlyCycleStore);
  const hydrated = useHydrated();
  return {
    createCycle,
    cycles: ready && hydrated ? cycles : [],
    ready: ready && hydrated,
    updateCycle,
  };
};
