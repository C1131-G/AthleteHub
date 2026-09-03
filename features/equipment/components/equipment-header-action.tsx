"use client";

import { PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { useAthletes } from "@/features/athlete/use-athletes";

import { equipmentNewHref } from "../equipment-routes";
import { findAthlete } from "../equipment-utils";

export const EquipmentHeaderAction = () => {
  const searchParams = useSearchParams();
  const { athletes, ready } = useAthletes();
  const athlete = findAthlete(athletes, searchParams.get("athleteId") ?? "");

  if (!ready || !athlete) {
    return null;
  }

  return (
    <Link className={buttonVariants()} href={equipmentNewHref(athlete.id)}>
      <PlusIcon /> Add setup
    </Link>
  );
};
