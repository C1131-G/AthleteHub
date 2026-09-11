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
import { statusOf } from "../../lib/test/status-of";
import { removeDirectory } from "../../lib/test/temp-database";
import {
  assessmentsForMonth,
  assessmentsForWeek,
  latestByType,
} from "./assessment-calculations";
import { createAssessmentService } from "./assessment-service";
import type { AssessmentService } from "./assessment-service";
import type { AssessmentInput } from "./assessment-types";

let directory: string;
let database: DatabaseContext;
let service: AssessmentService;

bunBeforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "athlete360-assess-"));
  database = await createDatabaseContext({
    databaseUrl: `file:${path.join(directory, "athlete360.db")}`,
  });
  service = createAssessmentService(database.collections);
});

bunAfterEach(async () => {
  await database.close();
  await removeDirectory(directory);
});

/** The mentis arm of the union; spreading the whole union loses its keys. */
type MentisInput = Extract<AssessmentInput, { assessmentType: "mentis" }>;

const mentis = (overrides: Partial<MentisInput> = {}): MentisInput => ({
  assessedOn: "2026-09-01",
  assessmentType: "mentis",
  athleteId: "a1",
  bowCant: 1.5,
  holdDurationSeconds: 20,
  holdStability: 7,
  setupStability: 8,
  ...overrides,
});
bunDescribe("dated assessments", () => {
  bunTest("persists same-day records and isolates athletes", async () => {
    bunExpect(await statusOf(service.create(mentis()))).toBe("saved");
    bunExpect(await statusOf(service.create(mentis({ athleteId: "a2" })))).toBe(
      "saved"
    );
    bunExpect(await service.list()).toHaveLength(2);
  });
  bunTest("uses actual date for month and week membership", async () => {
    const first = await service.create(mentis({ assessedOn: "2026-09-01" }));
    const second = await service.create(mentis({ assessedOn: "2026-08-31" }));
    const rows = await service.list();
    bunExpect(assessmentsForMonth(rows, "a1", "2026-09")).toHaveLength(1);
    bunExpect(assessmentsForWeek(rows, "a1", "2026-08-31")).toHaveLength(2);
    bunExpect(first.status).toBe("saved");
    bunExpect(second.status).toBe("saved");
  });
  bunTest("selects the latest record per type", async () => {
    await service.create(
      mentis({ assessedOn: "2026-09-01", holdStability: 4 })
    );
    await service.create(
      mentis({ assessedOn: "2026-09-02", holdStability: 9 })
    );
    const latest = latestByType(await service.list(), "2026-09").get("mentis");
    bunExpect(
      latest?.assessmentType === "mentis" ? latest.holdStability : undefined
    ).toBe(9);
  });
  bunTest("rejects future and empty records", async () => {
    bunExpect(
      await statusOf(service.create(mentis({ assessedOn: "2999-01-01" })))
    ).toBe("invalid");
    bunExpect(
      await statusOf(
        service.create({
          assessedOn: "2026-09-01",
          assessmentType: "dartfish",
          athleteId: "a1",
          technicalNotes: "",
        })
      )
    ).toBe("invalid");
  });
});
