"use client";

import { AthleteForm } from "./athlete-form";
import { AthleteProfile } from "./athlete-profile";
import { useAthletes } from "./athlete-provider";

export const EditAthlete = ({ athleteId }: { athleteId: string }) => {
  const { athletes, ready } = useAthletes();

  if (!ready) {
    return null;
  }

  const athlete = athletes.find((item) => item.id === athleteId);
  return athlete ? (
    <AthleteForm athlete={athlete} />
  ) : (
    <AthleteProfile athleteId={athleteId} />
  );
};
