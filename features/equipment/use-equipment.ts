"use client";

import { useStore } from "@tanstack/react-store";

import { useHydrated } from "@/hooks/use-hydrated";

import {
  createEquipmentSetup,
  equipmentStore,
  updateEquipmentSetup,
} from "./equipment-store";

export const useEquipment = () => {
  const { ready, setups } = useStore(equipmentStore);
  const hydrated = useHydrated();
  // Readers must not see stored setups until the client has hydrated, or the
  // first client render disagrees with the server HTML.
  const visible = ready && hydrated ? setups : [];

  return {
    createSetup: createEquipmentSetup,
    getSetup: (setupId: string) =>
      visible.find((setup) => setup.id === setupId),
    listByAthlete: (athleteId: string) =>
      visible.filter((setup) => setup.athleteId === athleteId),
    ready: ready && hydrated,
    updateSetup: updateEquipmentSetup,
  };
};
