import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import {
  formatDuration,
  latestAssessmentFor,
  overlappingActiveProgramme,
  parseDuration,
  previousResultFor,
  programmeMinutesByIntensity,
  resultChange,
  sessionMinutes,
} from "./conditioning-calculations";
import type {
  ConditioningAssessment,
  ConditioningProgramme,
  ConditioningSession,
  ConditioningTestResult,
} from "./conditioning-types";

const result = (
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

const assessment = (
  overrides: Partial<ConditioningAssessment> = {}
): ConditioningAssessment => ({
  assessedOn: "2026-07-01",
  athleteId: "a1",
  coachSummary: "",
  createdAt: "2026-07-01T00:00:00.000Z",
  developmentAreas: [],
  id: crypto.randomUUID(),
  recommendations: [],
  restrictionNotes: "",
  results: [result()],
  status: "completed",
  strengths: [],
  updatedAt: "2026-07-01T00:00:00.000Z",
  ...overrides,
});

const firstResult = (source: ConditioningAssessment) => {
  const [found] = source.results;
  if (!found) {
    throw new Error("Test fixture needs at least one result.");
  }
  return found;
};

const programme = (
  overrides: Partial<ConditioningProgramme> = {}
): ConditioningProgramme => ({
  athleteId: "a1",
  createdAt: "2026-07-01T00:00:00.000Z",
  endsOn: "2026-07-31",
  id: crypto.randomUUID(),
  objectives: [],
  phase: "foundation",
  restrictionNotes: "",
  sessions: [],
  startsOn: "2026-07-01",
  status: "active",
  title: "July block",
  updatedAt: "2026-07-01T00:00:00.000Z",
  ...overrides,
});

const session = (
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

bunDescribe("previous result matching", () => {
  bunTest("resolves from the immediately preceding assessment only", () => {
    const first = assessment({
      assessedOn: "2026-05-01",
      results: [result({ value: 30 })],
    });
    const second = assessment({
      assessedOn: "2026-06-01",
      results: [result({ value: 35 })],
    });
    const current = assessment({
      assessedOn: "2026-07-01",
      results: [result({ value: 40 })],
    });
    const previous = previousResultFor(
      [first, second, current],
      current,
      firstResult(current)
    );
    bunExpect(previous?.value).toBe(35);
  });

  bunTest("ignores results with the same key but a different unit", () => {
    const prior = assessment({
      assessedOn: "2026-06-01",
      results: [result({ unit: "kilograms", value: 50 })],
    });
    const current = assessment({
      assessedOn: "2026-07-01",
      results: [result()],
    });
    bunExpect(
      previousResultFor([prior, current], current, firstResult(current))
    ).toBeUndefined();
  });

  bunTest("never duplicates a previous value from the current record", () => {
    const current = assessment({
      assessedOn: "2026-07-01",
      results: [result({ value: 40 })],
    });
    bunExpect(
      previousResultFor([current], current, firstResult(current))
    ).toBeUndefined();
  });

  bunTest("marks lower-is-better improvements, like a 2 km run", () => {
    const prior = assessment({
      assessedOn: "2026-06-01",
      results: [
        result({
          improvementDirection: "lower",
          key: "run-2km",
          unit: "seconds",
          value: 600,
        }),
      ],
    });
    const current = assessment({
      assessedOn: "2026-07-01",
      results: [
        result({
          improvementDirection: "lower",
          key: "run-2km",
          unit: "seconds",
          value: 560,
        }),
      ],
    });
    const change = resultChange(
      [prior, current],
      current,
      firstResult(current)
    );
    bunExpect(change.direction).toBe("better");
    bunExpect(change.delta).toBe(-40);
  });

  bunTest("marks a decline for a lower-is-better test", () => {
    const prior = assessment({
      assessedOn: "2026-06-01",
      results: [
        result({
          improvementDirection: "lower",
          key: "run-2km",
          unit: "seconds",
          value: 560,
        }),
      ],
    });
    const current = assessment({
      assessedOn: "2026-07-01",
      results: [
        result({
          improvementDirection: "lower",
          key: "run-2km",
          unit: "seconds",
          value: 600,
        }),
      ],
    });
    bunExpect(
      resultChange([prior, current], current, firstResult(current)).direction
    ).toBe("worse");
  });
});

bunDescribe("duration formatting", () => {
  bunTest("formats seconds as m:ss", () => {
    bunExpect(formatDuration(92)).toBe("1:32");
    bunExpect(formatDuration(600)).toBe("10:00");
    bunExpect(formatDuration(0)).toBe("0:00");
  });

  bunTest("round-trips an m:ss entry into seconds", () => {
    bunExpect(parseDuration("1:32")).toBe(92);
    bunExpect(parseDuration("10:00")).toBe(600);
    bunExpect(parseDuration("90")).toBe(90);
    bunExpect(parseDuration("1:75")).toBeUndefined();
    bunExpect(parseDuration("")).toBeUndefined();
  });
});

bunDescribe("programme rules", () => {
  bunTest("detects overlapping active ranges for one athlete", () => {
    const programmes = [
      programme({ endsOn: "2026-07-31", id: "p1", startsOn: "2026-07-01" }),
    ];
    bunExpect(
      overlappingActiveProgramme(programmes, "a1", "2026-07-15", "2026-08-15")
    ).toBe(true);
    bunExpect(
      overlappingActiveProgramme(programmes, "a1", "2026-08-01", "2026-08-31")
    ).toBe(false);
    bunExpect(
      overlappingActiveProgramme(programmes, "a2", "2026-07-15", "2026-07-20")
    ).toBe(false);
    bunExpect(
      overlappingActiveProgramme(
        programmes,
        "a1",
        "2026-07-15",
        "2026-07-20",
        "p1"
      )
    ).toBe(false);
  });

  bunTest("computes session minutes and skips recovery sessions", () => {
    bunExpect(
      sessionMinutes(session({ endsAt: "08:30", startsAt: "07:00" }))
    ).toBe(90);
    bunExpect(
      sessionMinutes(
        session({ endsAt: "09:00", intensity: "recovery", startsAt: "07:00" })
      )
    ).toBe(0);
    bunExpect(
      sessionMinutes(
        session({ endsAt: "09:00", startsAt: "07:00", type: "Recovery" })
      )
    ).toBe(0);
  });

  bunTest("groups weekly minutes by intensity", () => {
    const highLoad = programme({
      sessions: [
        session({ endsAt: "18:00", intensity: "high", startsAt: "17:00" }),
        session({ endsAt: "17:30", intensity: "high", startsAt: "17:00" }),
        session({ endsAt: "09:00", intensity: "recovery", startsAt: "08:00" }),
      ],
    });
    bunExpect(programmeMinutesByIntensity(highLoad)).toEqual([
      { intensity: "high", minutes: 90 },
    ]);
  });
});

bunDescribe("monthly integration", () => {
  bunTest("resolves the latest assessment inside the month", () => {
    const assessments = [
      assessment({ assessedOn: "2026-06-20" }),
      assessment({ assessedOn: "2026-07-05", id: "a-jul-1" }),
      assessment({ assessedOn: "2026-07-25", id: "a-jul-2" }),
      assessment({ assessedOn: "2026-08-02" }),
    ];
    bunExpect(latestAssessmentFor(assessments, "a1", "2026-07")?.id).toBe(
      "a-jul-2"
    );
    bunExpect(
      latestAssessmentFor(assessments, "a1", "2026-09")
    ).toBeUndefined();
  });
});
