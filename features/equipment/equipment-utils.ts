import type { Athlete } from "@/features/athlete/athlete-types";

import type { EquipmentItem, EquipmentSetup } from "./equipment-types";

export const setupLabel = (setup: EquipmentSetup, index: number) =>
  index === 0 ? "Current setup" : `Previous setup ${index}`;

export const standardRows = (items: EquipmentItem[]) =>
  items.filter((item) => !item.custom || item.value || item.requirement);

export const findAthlete = (athletes: Athlete[], athleteId: string) =>
  athletes.find((athlete) => athlete.id === athleteId);

export const previousItem = (
  previousSetup: EquipmentSetup | undefined,
  item: EquipmentItem
) => previousSetup?.items.find((previous) => previous.key === item.key);
