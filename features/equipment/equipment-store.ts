import { Store } from "@tanstack/store";

import { equipmentRepository } from "./equipment-repository";
import type { EquipmentSetup, EquipmentSetupInput } from "./equipment-types";

interface EquipmentState {
  setups: EquipmentSetup[];
  ready: boolean;
}

/** Shared equipment state; see the note on athleteStore for the split. */
export const equipmentStore = new Store<EquipmentState>({
  ready: false,
  setups: [],
});

export const hydrateEquipment = () => {
  equipmentStore.setState(() => ({
    ready: true,
    setups: equipmentRepository.list(),
  }));
};

const commit = () => {
  equipmentStore.setState((state) => ({
    ...state,
    setups: equipmentRepository.list(),
  }));
};

export const createEquipmentSetup = (input: EquipmentSetupInput) => {
  const setup = equipmentRepository.create(input);
  commit();
  return setup;
};

export const updateEquipmentSetup = (
  setupId: string,
  input: EquipmentSetupInput
) => {
  const setup = equipmentRepository.update(setupId, input);
  commit();
  return setup;
};
