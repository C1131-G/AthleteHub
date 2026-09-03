import {
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { createMemoryStorage } from "@/lib/test/memory-storage";

import { equipmentRepository } from "./equipment-repository";
import type { EquipmentItem, EquipmentSetupInput } from "./equipment-types";

const STORAGE_KEY = "athletehub.equipment.v1";

bunBeforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

const item = (overrides: Partial<EquipmentItem> = {}): EquipmentItem => ({
  custom: false,
  id: "riser",
  key: "riser",
  label: "  Handle / riser  ",
  requirement: "  Replace grip  ",
  value: "  Hoyt Formula  ",
  ...overrides,
});

const setupInput = (
  overrides: Partial<EquipmentSetupInput> = {}
): EquipmentSetupInput => ({
  athleteId: "a1",
  coachNotes: "  Check tiller.  ",
  items: [item()],
  recordedAt: "2026-08-01",
  ...overrides,
});

bunDescribe("equipment persistence", () => {
  bunTest("returns nothing when storage holds no setups", () => {
    bunExpect(equipmentRepository.list()).toEqual([]);
    bunExpect(equipmentRepository.get("missing")).toBeUndefined();
  });

  bunTest("skips stored setups that no longer parse", () => {
    equipmentRepository.create(setupInput());
    const stored: unknown[] = JSON.parse(
      globalThis.localStorage.getItem(STORAGE_KEY) ?? "[]"
    );
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...stored, { id: "broken" }, "not an object"])
    );

    // One corrupt record must not discard the rest of the setup history.
    bunExpect(equipmentRepository.list()).toHaveLength(1);
  });

  bunTest("rejects a setup whose items are not equipment items", () => {
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        // A duck-type guard would accept this: `items` is an array.
        {
          athleteId: "a1",
          id: "s1",
          items: ["not an item"],
          recordedAt: "2026-08-01",
        },
      ])
    );
    bunExpect(equipmentRepository.list()).toEqual([]);
  });

  bunTest("lists the most recently recorded setup first", () => {
    equipmentRepository.create(setupInput({ recordedAt: "2026-07-01" }));
    equipmentRepository.create(setupInput({ recordedAt: "2026-09-01" }));
    bunExpect(
      equipmentRepository.list().map((setup) => setup.recordedAt)
    ).toEqual(["2026-09-01", "2026-07-01"]);
  });

  bunTest("lists only the setups belonging to one athlete", () => {
    equipmentRepository.create(setupInput());
    equipmentRepository.create(setupInput({ athleteId: "a2" }));
    bunExpect(equipmentRepository.listByAthlete("a1")).toHaveLength(1);
    bunExpect(equipmentRepository.listByAthlete("a3")).toEqual([]);
  });
});

bunDescribe("equipment mutations", () => {
  bunTest("trims free text on create", () => {
    const created = equipmentRepository.create(setupInput());
    bunExpect(created.coachNotes).toBe("Check tiller.");
    bunExpect(created.items[0]?.value).toBe("Hoyt Formula");
    bunExpect(created.items[0]?.requirement).toBe("Replace grip");
  });

  bunTest("updates a setup and keeps its identity", () => {
    const created = equipmentRepository.create(setupInput());
    const updated = equipmentRepository.update(
      created.id,
      setupInput({ coachNotes: "Revised." })
    );
    bunExpect(updated?.id).toBe(created.id);
    bunExpect(updated?.createdAt).toBe(created.createdAt);
    bunExpect(equipmentRepository.get(created.id)?.coachNotes).toBe("Revised.");
  });

  bunTest("returns nothing when updating an unknown setup", () => {
    bunExpect(
      equipmentRepository.update("missing", setupInput())
    ).toBeUndefined();
  });
});
