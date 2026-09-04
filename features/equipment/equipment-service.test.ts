import {
  afterEach as bunAfterEach,
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createDatabaseContext } from "../../electron/backend";
import type { DatabaseContext } from "../../electron/backend";
import { expectSaved } from "../../lib/test/expect-saved";
import { removeDirectory } from "../../lib/test/temp-database";
import { createEquipmentSetupService } from "./equipment-service";
import type { EquipmentSetupService } from "./equipment-service";
import type { EquipmentItem, EquipmentSetupInput } from "./equipment-types";

let directory: string;
let database: DatabaseContext;
let service: EquipmentSetupService;

bunBeforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "athletehub-equip-"));
  database = await createDatabaseContext({
    databaseUrl: `file:${path.join(directory, "athletehub.db")}`,
  });
  service = createEquipmentSetupService(database.collections);
});

bunAfterEach(async () => {
  await database.close();
  await removeDirectory(directory);
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
  bunTest("returns nothing when nothing is stored", async () => {
    bunExpect(await service.list()).toEqual([]);
    bunExpect(await service.get("missing")).toBeUndefined();
  });

  bunTest("rejects a setup whose items are not equipment items", async () => {
    // A duck-type guard would accept this: `items` is an array.
    const result = await service.create({
      athleteId: "a1",
      coachNotes: "",
      items: ["not an item"],
      recordedAt: "2026-08-01",
    });
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("lists the most recently recorded setup first", async () => {
    await service.create(setupInput({ recordedAt: "2026-07-01" }));
    await service.create(setupInput({ recordedAt: "2026-09-01" }));
    const setups = await service.list();
    bunExpect(setups.map((setup) => setup.recordedAt)).toEqual([
      "2026-09-01",
      "2026-07-01",
    ]);
  });

  bunTest("lists only the setups belonging to one athlete", async () => {
    await service.create(setupInput());
    await service.create(setupInput({ athleteId: "a2" }));
    bunExpect(await service.list({ athleteId: "a1" })).toHaveLength(1);
    bunExpect(await service.list({ athleteId: "a3" })).toEqual([]);
  });
});

bunDescribe("equipment mutations", () => {
  bunTest("trims free text on create", async () => {
    const created = await expectSaved(service.create(setupInput()));
    bunExpect(created.coachNotes).toBe("Check tiller.");
    bunExpect(created.items[0]?.value).toBe("Hoyt Formula");
    bunExpect(created.items[0]?.requirement).toBe("Replace grip");
  });

  bunTest("updates a setup and keeps its identity", async () => {
    const created = await expectSaved(service.create(setupInput()));
    const updated = await expectSaved(
      service.update(created.id, setupInput({ coachNotes: "Revised." }))
    );
    bunExpect(updated.id).toBe(created.id);
    bunExpect(updated.createdAt).toBe(created.createdAt);
    const stored = await service.get(created.id);
    bunExpect(stored?.coachNotes).toBe("Revised.");
  });

  bunTest("reports a missing setup instead of creating one", async () => {
    const result = await service.update("missing", setupInput());
    bunExpect(result.status).toBe("not-found");
  });
});
