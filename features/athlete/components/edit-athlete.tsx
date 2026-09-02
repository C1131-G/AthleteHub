"use client";

import { useAthletes } from "../use-athletes";
import { AthleteForm } from "./athlete-form";
import { AthleteProfile } from "./athlete-profile";

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
