"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { athleteRepository } from "../athlete-repository";
import type { Athlete, AthleteInput } from "../athlete-types";

interface AthleteContextValue {
  athletes: Athlete[];
  ready: boolean;
  createAthlete: (input: AthleteInput) => Athlete;
  updateAthlete: (id: string, input: AthleteInput) => Athlete | undefined;
}

const AthleteContext = createContext<AthleteContextValue | null>(null);

export const AthleteProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAthletes(athleteRepository.list());
    setReady(true);
  }, []);

  const value: AthleteContextValue = {
    athletes,
    createAthlete: (input) => {
      const athlete = athleteRepository.create(input);
      setAthletes(athleteRepository.list());
      return athlete;
    },
    ready,
    updateAthlete: (id, input) => {
      const athlete = athleteRepository.update(id, input);
      setAthletes(athleteRepository.list());
      return athlete;
    },
  };

  return (
    <AthleteContext.Provider value={value}>{children}</AthleteContext.Provider>
  );
};

export const useAthletes = () => {
  const context = useContext(AthleteContext);
  if (!context) {
    throw new Error("useAthletes must be used inside AthleteProvider.");
  }
  return context;
};
