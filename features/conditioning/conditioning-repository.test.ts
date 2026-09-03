import {
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { createMemoryStorage } from "@/lib/test/memory-storage";

import { conditioningRepository } from "./conditioning-repository";
import type {
  ConditioningAssessmentInput,
  ConditioningProgrammeInput,
  ConditioningSession,
  ConditioningTestResult,
} from "./conditioning-types";

bunBeforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
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
  bunTest("saves and lists an assessment with the athlete/date key", () => {
    const saved = conditioningRepository.createAssessment(assessmentInput());
    bunExpect(saved.status).toBe("saved");
    bunExpect(conditioningRepository.listAssessments()).toHaveLength(1);
    bunExpect(saved.status === "saved" ? saved.record.athleteId : "").toBe(
      "a1"
    );
  });

  bunTest(
    "rejects a duplicate assessment for the same athlete and date",
    () => {
      conditioningRepository.createAssessment(assessmentInput());
      const duplicate = conditioningRepository.createAssessment(
        assessmentInput({ results: [testResult({ value: 45 })] })
      );
      bunExpect(duplicate.status).toBe("duplicate");
      bunExpect(fieldError(duplicate, "assessedOn")).toContain(
        "already exists"
      );
    }
  );

  bunTest("keeps assessments for different athletes on the same date", () => {
    conditioningRepository.createAssessment(assessmentInput());
    bunExpect(
      conditioningRepository.createAssessment(
        assessmentInput({ athleteId: "a2" })
      ).status
    ).toBe("saved");
  });

  bunTest("requires at least one result for a completed assessment", () => {
    const result = conditioningRepository.createAssessment(
      assessmentInput({ results: [] })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(fieldError(result, "results")).toContain(
      "at least one test result"
    );
  });

  bunTest("requires an explanatory note for a medical exemption", () => {
    const result = conditioningRepository.createAssessment(
      assessmentInput({ coachSummary: "  ", status: "medical-exemption" })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(fieldError(result, "coachSummary")).toContain("explanatory note");
  });

  bunTest("requires an explanatory note for an absence", () => {
    const result = conditioningRepository.createAssessment(
      assessmentInput({ coachSummary: "", status: "absent" })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("rejects non-positive test values", () => {
    const result = conditioningRepository.createAssessment(
      assessmentInput({
        results: [testResult({ value: 0 })],
      })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("rejects duplicate test labels within one assessment", () => {
    const result = conditioningRepository.createAssessment(
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

  bunTest("requires a custom unit label for custom units", () => {
    const result = conditioningRepository.createAssessment(
      assessmentInput({
        results: [testResult({ customUnit: " ", unit: "custom" })],
      })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest(
    "drops records that fail parsing without losing valid history",
    () => {
      conditioningRepository.createAssessment(assessmentInput());
      // SAFETY: the storage key is written by the repository as a JSON array.
      const raw = JSON.parse(
        globalThis.localStorage.getItem(
          "athletehub.conditioning-assessments.v1"
        ) ?? "[]"
      ) as unknown[];
      raw.push({ athleteId: "a2", broken: true });
      globalThis.localStorage.setItem(
        "athletehub.conditioning-assessments.v1",
        JSON.stringify(raw)
      );
      bunExpect(conditioningRepository.listAssessments()).toHaveLength(1);
    }
  );

  bunTest("updates an assessment without duplicating it", () => {
    const saved = conditioningRepository.createAssessment(assessmentInput());
    if (saved.status !== "saved") {
      throw new Error("expected save");
    }
    const updated = conditioningRepository.updateAssessment(saved.record.id, {
      ...assessmentInput(),
      results: [testResult({ value: 42 })],
    });
    bunExpect(updated.status).toBe("saved");
    bunExpect(conditioningRepository.listAssessments()).toHaveLength(1);
    bunExpect(
      updated.status === "saved" ? updated.record.results[0]?.value : 0
    ).toBe(42);
  });
});

bunDescribe("programme repository", () => {
  bunTest("saves a draft programme with the deck session structure", () => {
    const saved = conditioningRepository.createProgramme(
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
  });

  bunTest("rejects an end date before the start date", () => {
    const result = conditioningRepository.createProgramme(
      programmeInput({ endsOn: "2026-06-30", startsOn: "2026-07-01" })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(fieldError(result, "endsOn")).toContain("before the start date");
  });

  bunTest("rejects a session that ends before it starts", () => {
    const result = conditioningRepository.createProgramme(
      programmeInput({
        sessions: [sessionInput({ endsAt: "06:30" })],
      })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(fieldError(result, "sessions")).toBeTruthy();
  });

  bunTest("rejects exercise prescriptions on a recovery session", () => {
    const result = conditioningRepository.createProgramme(
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

  bunTest("rejects an RPE outside 1–10", () => {
    const result = conditioningRepository.createProgramme(
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

  bunTest("rejects negative prescription values", () => {
    const result = conditioningRepository.createProgramme(
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

  bunTest("rejects overlapping active programmes for one athlete", () => {
    conditioningRepository.createProgramme(
      programmeInput({
        endsOn: "2026-07-31",
        startsOn: "2026-07-01",
        status: "active",
      })
    );
    const result = conditioningRepository.createProgramme(
      programmeInput({
        endsOn: "2026-08-15",
        startsOn: "2026-07-15",
        status: "active",
      })
    );
    bunExpect(result.status).toBe("duplicate");
    bunExpect(fieldError(result, "startsOn")).toContain("already covers");
  });

  bunTest("allows adjacent non-overlapping active programmes", () => {
    conditioningRepository.createProgramme(
      programmeInput({
        endsOn: "2026-07-31",
        startsOn: "2026-07-01",
        status: "active",
      })
    );
    bunExpect(
      conditioningRepository.createProgramme(
        programmeInput({
          endsOn: "2026-08-31",
          startsOn: "2026-08-01",
          status: "active",
        })
      ).status
    ).toBe("saved");
  });

  bunTest("requires a name for a custom phase", () => {
    const result = conditioningRepository.createProgramme(
      programmeInput({ customPhase: " ", phase: "custom" })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest(
    "parses stored records independently so one bad record survives",
    () => {
      conditioningRepository.createProgramme(programmeInput());
      // SAFETY: the storage key is written by the repository as a JSON array.
      const raw = JSON.parse(
        globalThis.localStorage.getItem(
          "athletehub.conditioning-programmes.v1"
        ) ?? "[]"
      ) as unknown[];
      raw.push({ id: "broken" });
      globalThis.localStorage.setItem(
        "athletehub.conditioning-programmes.v1",
        JSON.stringify(raw)
      );
      bunExpect(conditioningRepository.listProgrammes()).toHaveLength(1);
    }
  );
});
