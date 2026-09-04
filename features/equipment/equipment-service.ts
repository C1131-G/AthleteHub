import type { Collections } from "../../electron/collections";
import { createCollectionService } from "../../lib/collection-service";
import type { CollectionService } from "../../lib/collection-service";
import {
  equipmentSetupInputSchema,
  equipmentSetupSchema,
} from "./equipment-types";
import type { EquipmentSetup } from "./equipment-types";

export type EquipmentSetupService = CollectionService<EquipmentSetup>;

export const createEquipmentSetupService = (
  collections: Collections
): EquipmentSetupService => {
  const collection = collections.equipment;
  return createCollectionService({
    archive: collection.archive,
    duplicateFieldErrors: { form: "That equipment setup already exists." },
    get: collection.get,
    identify: (record) => record.id,
    inputSchema: equipmentSetupInputSchema,
    list: collection.list,
    make: (input, identity) => ({ ...input, ...identity }),
    merge: (existing, input, updatedAt) => ({
      ...existing,
      ...input,
      updatedAt,
    }),
    normalize: (input) => ({
      ...input,
      coachNotes: input.coachNotes.trim(),
      items: input.items.map((item) => ({
        ...item,
        label: item.label.trim(),
        requirement: item.requirement.trim(),
        value: item.value.trim(),
      })),
    }),
    notFoundMessage: "Equipment setup not found.",
    recordSchema: equipmentSetupSchema,
    restore: collection.restore,
    save: (setup) =>
      collection.save({
        athleteId: setup.athleteId,
        id: setup.id,
        recordedAt: setup.recordedAt,
        snapshot: JSON.stringify(setup),
      }),
  });
};
