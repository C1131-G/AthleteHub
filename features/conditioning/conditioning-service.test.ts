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
import { createConditioningAssessmentService } from "./conditioning-assessment-service";
import type { ConditioningAssessmentService } from "./conditioning-assessment-service";
import { createConditioningProgrammeService } from "./conditioning-programme-service";
import type { ConditioningProgrammeService } from "./conditioning-programme-service";
import type {
  ConditioningAssessmentInput,
  ConditioningProgrammeInput,
  ConditioningSession,
  ConditioningTestResult,
} from "./conditioning-types";

let directory: string;
let database: DatabaseContext;
let assessments: ConditioningAssessmentService;
let programmes: ConditioningProgrammeService;

bunBeforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "athletehub-cond-"));
  database = await createDatabaseContext({
    databaseUrl: `file:${path.join(directory, "athletehub.db")}`,
  });
  assessments = createConditioningAssessmentService(database.collections);
  programmes = createConditioningProgrammeService(database.collections);
});

bunAfterEach(async () => {
  await database.close();
  await removeDirectory(directory);
});

const testResult = (
  overrides: Partial<ConditioningTestResult> = {}
): ConditioningTestResult => ({
  category: "muscular-endurance",
  id: crypto.randomUUID(),
  improvementDirection: "higher",
  key: "push-ups",
  label: "Push-ups",
  notes: "",
  protocol: "Max reps in one minute",
  rating: "good",
  unit: "repetitions",
  value: 40,
  ...overrides,
});

const assessmentInput = (
  overrides: Partial<ConditioningAssessmentInput> = {}
): ConditioningAssessmentInput => ({
  assessedOn: "2026-07-01",
  athleteId: "a1",
  coachSummary: "",
  developmentAreas: [],
  recommendations: [],
  restrictionNotes: "",
  results: [testResult()],
  status: "completed",
  strengths: [],
  ...overrides,
});

const sessionInput = (
  overrides: Partial<ConditioningSession> = {}
): ConditioningSession => ({
  endsAt: "08:00",
  exercises: [],
  id: crypto.randomUUID(),
  intensity: "moderate",
  notes: "",
  startsAt: "07:00",
  title: "Strength",
  type: "Strength",
  weekday: 1,
  ...overrides,
});

const programmeInput = (
  overrides: Partial<ConditioningProgrammeInput> = {}
): ConditioningProgrammeInput => ({
  athleteId: "a1",
  endsOn: "2026-07-31",
  objectives: ["Build aerobic base"],
  phase: "foundation",
  restrictionNotes: "",
  sessions: [sessionInput()],
  startsOn: "2026-07-01",
  status: "draft",
  title: "July block",
  ...overrides,
});

const fieldError = (
  result: { fieldErrors?: Record<string, string>; status: string },
  field: string
) => result.fieldErrors?.[field] ?? "";

bunDescribe("conditioning repository", () => {
  bunTest(
    "saves and lists an assessment with the athlete/date key",
    async () => {
      const saved = await assessments.create(assessmentInput());
      bunExpect(saved.status).toBe("saved");
      bunExpect(await assessments.list()).toHaveLength(1);
      bunExpect(saved.status === "saved" ? saved.record.athleteId : "").toBe(
        "a1"
      );
    }
  );

  bunTest(
    "rejects a duplicate assessment for the same athlete and date",
    async () => {
      await assessments.create(assessmentInput());
      const duplicate = await assessments.create(
        assessmentInput({ results: [testResult({ value: 45 })] })
      );
      bunExpect(duplicate.status).toBe("duplicate");
      bunExpect(fieldError(duplicate, "assessedOn")).toContain(
        "already exists"
      );
    }
  );

  bunTest(
    "keeps assessments for different athletes on the same date",
    async () => {
      await assessments.create(assessmentInput());
      bunExpect(
        await statusOf(assessments.create(assessmentInput({ athleteId: "a2" })))
      ).toBe("saved");
    }
  );

  bunTest(
    "requires at least one result for a completed assessment",
    async () => {
      const result = await assessments.create(assessmentInput({ results: [] }));
      bunExpect(result.status).toBe("invalid");
      bunExpect(fieldError(result, "results")).toContain(
        "at least one test result"
      );
    }
  );

  bunTest("requires an explanatory note for a medical exemption", async () => {
    const result = await assessments.create(
      assessmentInput({ coachSummary: "  ", status: "medical-exemption" })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(fieldError(result, "coachSummary")).toContain("explanatory note");
  });

  bunTest("requires an explanatory note for an absence", async () => {
    const result = await assessments.create(
      assessmentInput({ coachSummary: "", status: "absent" })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("rejects non-positive test values", async () => {
    const result = await assessments.create(
      assessmentInput({
        results: [testResult({ value: 0 })],
      })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("rejects duplicate test labels within one assessment", async () => {
    const result = await assessments.create(
      assessmentInput({
        results: [
          testResult(),
          testResult({ id: crypto.randomUUID(), label: "push-ups" }),
        ],
      })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(fieldError(result, "results")).toContain("more than once");
  });

  bunTest("requires a custom unit label for custom units", async () => {
    const result = await assessments.create(
      assessmentInput({
        results: [testResult({ customUnit: " ", unit: "custom" })],
      })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("updates an assessment without duplicating it", async () => {
    const saved = await assessments.create(assessmentInput());
    if (saved.status !== "saved") {
      throw new Error("expected save");
    }
    const updated = await assessments.update(saved.record.id, {
      ...assessmentInput(),
      results: [testResult({ value: 42 })],
    });
    bunExpect(updated.status).toBe("saved");
    bunExpect(await assessments.list()).toHaveLength(1);
    bunExpect(
      updated.status === "saved" ? updated.record.results[0]?.value : 0
    ).toBe(42);
  });
});

bunDescribe("programme repository", () => {
  bunTest(
    "saves a draft programme with the deck session structure",
    async () => {
      const saved = await programmes.create(
        programmeInput({
          sessions: [
            sessionInput({
              exercises: [
                {
                  id: crypto.randomUUID(),
                  name: "Squat",
                  notes: "",
                  reps: 10,
                  sets: 3,
                },
              ],
            }),
          ],
        })
      );
      bunExpect(saved.status).toBe("saved");
    }
  );

  bunTest("rejects an end date before the start date", async () => {
    const result = await programmes.create(
      programmeInput({ endsOn: "2026-06-30", startsOn: "2026-07-01" })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(fieldError(result, "endsOn")).toContain("before the start date");
  });

  bunTest("rejects a session that ends before it starts", async () => {
    const result = await programmes.create(
      programmeInput({
        sessions: [sessionInput({ endsAt: "06:30" })],
      })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(fieldError(result, "sessions")).toBeTruthy();
  });

  bunTest("rejects exercise prescriptions on a recovery session", async () => {
    const result = await programmes.create(
      programmeInput({
        sessions: [
          sessionInput({
            exercises: [{ id: crypto.randomUUID(), name: "Squat", notes: "" }],
            type: "Recovery",
          }),
        ],
      })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("rejects an RPE outside 1–10", async () => {
    const result = await programmes.create(
      programmeInput({
        sessions: [
          sessionInput({
            exercises: [
              {
                id: crypto.randomUUID(),
                name: "Squat",
                notes: "",
                rpe: 11,
              },
            ],
          }),
        ],
      })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("rejects negative prescription values", async () => {
    const result = await programmes.create(
      programmeInput({
        sessions: [
          sessionInput({
            exercises: [
              {
                id: crypto.randomUUID(),
                loadKg: -5,
                name: "Squat",
                notes: "",
              },
            ],
          }),
        ],
      })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("rejects overlapping active programmes for one athlete", async () => {
    await programmes.create(
      programmeInput({
        endsOn: "2026-07-31",
        startsOn: "2026-07-01",
        status: "active",
      })
    );
    const result = await programmes.create(
      programmeInput({
        endsOn: "2026-08-15",
        startsOn: "2026-07-15",
        status: "active",
      })
    );
    bunExpect(result.status).toBe("duplicate");
    bunExpect(fieldError(result, "startsOn")).toContain("already covers");
  });

  bunTest("allows adjacent non-overlapping active programmes", async () => {
    await programmes.create(
      programmeInput({
        endsOn: "2026-07-31",
        startsOn: "2026-07-01",
        status: "active",
      })
    );
    bunExpect(
      await statusOf(
        programmes.create(
          programmeInput({
            endsOn: "2026-08-31",
            startsOn: "2026-08-01",
            status: "active",
          })
        )
      )
    ).toBe("saved");
  });

  bunTest("requires a name for a custom phase", async () => {
    const result = await programmes.create(
      programmeInput({ customPhase: " ", phase: "custom" })
    );
    bunExpect(result.status).toBe("invalid");
  });
});
