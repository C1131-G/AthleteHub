"use client";

import { useStore } from "@tanstack/react-store";

import { useHydrated } from "@/hooks/use-hydrated";

import { athleteStore, createAthlete, updateAthlete } from "./athlete-store";

export const useAthletes = () => {
  const { athletes, ready } = useStore(athleteStore);
  const hydrated = useHydrated();

  return { athletes, createAthlete, ready: ready && hydrated, updateAthlete };
};
