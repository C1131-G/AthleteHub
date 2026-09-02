import { readStoredArray, writeStored } from "@/lib/storage";

import type { EquipmentSetup, EquipmentSetupInput } from "./equipment-types";

const STORAGE_KEY = "athletehub.equipment.v1";

const isEquipmentSetup = (value: unknown): value is EquipmentSetup => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    "id" in value &&
    "athleteId" in value &&
    "recordedAt" in value &&
    "items" in value &&
    Array.isArray(value.items)
  );
};

// Keep every setup that still parses rather than discarding the whole history.
const readSetups = (): EquipmentSetup[] =>
  readStoredArray(STORAGE_KEY).filter(isEquipmentSetup);

const writeSetups = (setups: EquipmentSetup[]) =>
  writeStored(STORAGE_KEY, setups);

const sortedByRecency = (setups: EquipmentSetup[]) =>
  setups.toSorted((a, b) =>
    `${b.recordedAt}${b.createdAt}`.localeCompare(
      `${a.recordedAt}${a.createdAt}`
    )
  );

export interface EquipmentRepository {
  list: () => EquipmentSetup[];
  listByAthlete: (athleteId: string) => EquipmentSetup[];
  get: (setupId: string) => EquipmentSetup | undefined;
  create: (input: EquipmentSetupInput) => EquipmentSetup;
  update: (
    setupId: string,
    input: EquipmentSetupInput
  ) => EquipmentSetup | undefined;
}

export const equipmentRepository: EquipmentRepository = {
  create: (input) => {
    const setups = readSetups();
    const now = new Date().toISOString();
    const setup: EquipmentSetup = {
      ...input,
      coachNotes: input.coachNotes.trim(),
      createdAt: now,
      id: crypto.randomUUID(),
      items: input.items.map((item) => ({
        ...item,
        label: item.label.trim(),
        requirement: item.requirement.trim(),
        value: item.value.trim(),
      })),
      updatedAt: now,
    };
    writeSetups([setup, ...setups]);
    return setup;
  },
  get: (setupId) => readSetups().find((setup) => setup.id === setupId),
  list: () => sortedByRecency(readSetups()),
  listByAthlete: (athleteId) =>
    sortedByRecency(
      readSetups().filter((setup) => setup.athleteId === athleteId)
    ),
  update: (setupId, input) => {
    const setups = readSetups();
    const existing = setups.find((setup) => setup.id === setupId);
    if (!existing) {
      return;
    }
    const updated: EquipmentSetup = {
      ...existing,
      ...input,
      coachNotes: input.coachNotes.trim(),
      items: input.items.map((item) => ({
        ...item,
        label: item.label.trim(),
        requirement: item.requirement.trim(),
        value: item.value.trim(),
      })),
      updatedAt: new Date().toISOString(),
    };
    writeSetups(
      setups.map((setup) => (setup.id === setupId ? updated : setup))
    );
    return updated;
  },
};
