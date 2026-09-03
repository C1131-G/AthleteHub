import {
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { createMemoryStorage } from "@/lib/test/memory-storage";

import {
  assessmentsForMonth,
  assessmentsForWeek,
  latestByType,
} from "./assessment-calculations";
import { assessmentRepository } from "./assessment-repository";
import type { AssessmentInput } from "./assessment-types";

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
bunBeforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});
bunDescribe("dated assessments", () => {
  bunTest("persists same-day records and isolates athletes", () => {
    bunExpect(assessmentRepository.create(mentis()).status).toBe("saved");
    bunExpect(
      assessmentRepository.create(mentis({ athleteId: "a2" })).status
    ).toBe("saved");
    bunExpect(assessmentRepository.list()).toHaveLength(2);
  });
  bunTest("ignores malformed records without losing valid records", () => {
    assessmentRepository.create(mentis());
    const raw: unknown = JSON.parse(
      globalThis.localStorage.getItem("athletehub.assessments.v1") ?? "[]"
    );
    const stored = Array.isArray(raw) ? raw : [];
    globalThis.localStorage.setItem(
      "athletehub.assessments.v1",
      JSON.stringify([...stored, { id: "broken" }])
    );
    bunExpect(assessmentRepository.list()).toHaveLength(1);
  });
  bunTest("uses actual date for month and week membership", () => {
    const first = assessmentRepository.create(
      mentis({ assessedOn: "2026-09-01" })
    );
    const second = assessmentRepository.create(
      mentis({ assessedOn: "2026-08-31" })
    );
    const rows = assessmentRepository.list();
    bunExpect(assessmentsForMonth(rows, "a1", "2026-09")).toHaveLength(1);
    bunExpect(assessmentsForWeek(rows, "a1", "2026-08-31")).toHaveLength(2);
    bunExpect(first.status).toBe("saved");
    bunExpect(second.status).toBe("saved");
  });
  bunTest("selects the latest record per type", () => {
    assessmentRepository.create(
      mentis({ assessedOn: "2026-09-01", holdStability: 4 })
    );
    assessmentRepository.create(
      mentis({ assessedOn: "2026-09-02", holdStability: 9 })
    );
    const latest = latestByType(assessmentRepository.list(), "2026-09").get(
      "mentis"
    );
    bunExpect(
      latest?.assessmentType === "mentis" ? latest.holdStability : undefined
    ).toBe(9);
  });
  bunTest("rejects future and empty records", () => {
    bunExpect(
      assessmentRepository.create(mentis({ assessedOn: "2999-01-01" })).status
    ).toBe("invalid");
    bunExpect(
      assessmentRepository.create({
        assessedOn: "2026-09-01",
        assessmentType: "dartfish",
        athleteId: "a1",
        technicalNotes: "",
      }).status
    ).toBe("invalid");
  });
});
