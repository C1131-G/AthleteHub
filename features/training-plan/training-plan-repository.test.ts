import {
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { createMemoryStorage } from "@/lib/test/memory-storage";

import { trainingPlanRepository } from "./training-plan-repository";
import type {
  SeasonTrainingPlanInput,
  TrainingPlanWeek,
} from "./training-plan-types";

const STORAGE_KEY = "athletehub.training-plans.v1";

bunBeforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

const week = (
  weekStart: string,
  overrides: Partial<TrainingPlanWeek> = {}
): TrainingPlanWeek => ({
  arrowsPlanned: 1200,
  id: `w-${weekStart}`,
  technicalFocus: "Shot routine",
  trainingDaysPlanned: 6,
  weekStart,
  ...overrides,
});

const planInput = (
  overrides: Partial<SeasonTrainingPlanInput> = {}
): SeasonTrainingPlanInput => ({
  athleteId: "a1",
  endsOn: "2026-05-31",
  events: [],
  name: "Season 2026",
  startsOn: "2026-03-01",
  status: "draft",
  strategyNotes: "Build volume before the nationals.",
  weeks: [week("2026-03-02"), week("2026-03-09")],
  ...overrides,
});

const savedPlan = (overrides: Partial<SeasonTrainingPlanInput> = {}) => {
  const result = trainingPlanRepository.create(planInput(overrides));
  if (result.status !== "saved") {
    throw new Error(`expected a saved plan, got ${result.status}`);
  }
  return result.plan;
};

bunDescribe("training plan schema", () => {
  bunTest("rejects a season that ends before it starts", () => {
    const result = trainingPlanRepository.create(
      planInput({ endsOn: "2026-02-01" })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.endsOn : ""
    ).toContain("cannot be before");
  });

  bunTest("rejects a plan with no weeks", () => {
    const result = trainingPlanRepository.create(planInput({ weeks: [] }));
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.weeks : ""
    ).toBeTruthy();
  });

  bunTest("rejects two weeks with the same start date", () => {
    const result = trainingPlanRepository.create(
      planInput({
        weeks: [week("2026-03-02"), week("2026-03-02", { id: "w-dup" })],
      })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.weeks : ""
    ).toContain("more than once");
  });

  bunTest("rejects a week outside the season range", () => {
    const result = trainingPlanRepository.create(
      planInput({ weeks: [week("2026-08-03")] })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.weeks : ""
    ).toContain("outside the season");
  });

  bunTest("rejects arrow targets that are not positive whole numbers", () => {
    bunExpect(
      trainingPlanRepository.create(
        planInput({ weeks: [week("2026-03-02", { arrowsPlanned: 0 })] })
      ).status
    ).toBe("invalid");
    bunExpect(
      trainingPlanRepository.create(
        planInput({ weeks: [week("2026-03-02", { arrowsPlanned: 12.5 })] })
      ).status
    ).toBe("invalid");
  });

  bunTest("rejects planned training days outside 1 to 7", () => {
    bunExpect(
      trainingPlanRepository.create(
        planInput({ weeks: [week("2026-03-02", { trainingDaysPlanned: 0 })] })
      ).status
    ).toBe("invalid");
    bunExpect(
      trainingPlanRepository.create(
        planInput({ weeks: [week("2026-03-02", { trainingDaysPlanned: 8 })] })
      ).status
    ).toBe("invalid");
  });

  bunTest("rejects a target distance or score that is not positive", () => {
    bunExpect(
      trainingPlanRepository.create(planInput({ targetDistanceM: 0 })).status
    ).toBe("invalid");
    bunExpect(
      trainingPlanRepository.create(planInput({ targetScore: -10 })).status
    ).toBe("invalid");
  });
});

bunDescribe("training plan events", () => {
  bunTest("requires a start date for a scheduled event", () => {
    const result = trainingPlanRepository.create(
      planInput({
        events: [
          {
            dateStatus: "scheduled",
            id: "e1",
            location: "Pune",
            name: "Nationals",
            notes: "",
            priority: "primary",
          },
        ],
      })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("accepts a to-be-decided event with no dates", () => {
    const plan = savedPlan({
      events: [
        {
          dateStatus: "tbd",
          id: "e1",
          location: "",
          name: "Selection trial",
          notes: "",
          priority: "secondary",
        },
      ],
    });
    bunExpect(plan.events[0]?.startsOn).toBeUndefined();
  });

  bunTest("drops dates carried over when an event becomes undecided", () => {
    const plan = savedPlan({
      events: [
        {
          dateStatus: "tbd",
          endsOn: "2026-04-12",
          id: "e1",
          location: "",
          name: "Selection trial",
          notes: "",
          priority: "secondary",
          startsOn: "2026-04-10",
        },
      ],
    });
    bunExpect(plan.events[0]?.startsOn).toBeUndefined();
    bunExpect(plan.events[0]?.endsOn).toBeUndefined();
  });

  bunTest("rejects an event that ends before it starts", () => {
    const result = trainingPlanRepository.create(
      planInput({
        events: [
          {
            dateStatus: "scheduled",
            endsOn: "2026-04-09",
            id: "e1",
            location: "",
            name: "Nationals",
            notes: "",
            priority: "primary",
            startsOn: "2026-04-10",
          },
        ],
      })
    );
    bunExpect(result.status).toBe("invalid");
  });

  bunTest("requires a name on every event", () => {
    const result = trainingPlanRepository.create(
      planInput({
        events: [
          {
            dateStatus: "tbd",
            id: "e1",
            location: "",
            name: "   ",
            notes: "",
            priority: "development",
          },
        ],
      })
    );
    bunExpect(result.status).toBe("invalid");
  });
});

bunDescribe("training plan duplicates", () => {
  bunTest("rejects a second plan with the same name for one athlete", () => {
    savedPlan();
    const duplicate = trainingPlanRepository.create(planInput());
    bunExpect(duplicate.status).toBe("duplicate");
    bunExpect(
      duplicate.status === "duplicate" ? duplicate.fieldErrors.name : ""
    ).toContain("already has a plan");
  });

  bunTest("allows the same plan name for a different athlete", () => {
    savedPlan();
    bunExpect(
      trainingPlanRepository.create(planInput({ athleteId: "a2" })).status
    ).toBe("saved");
  });

  bunTest("allows only one active plan per athlete", () => {
    savedPlan({ name: "Season A", status: "active" });
    const second = trainingPlanRepository.create(
      planInput({ name: "Season B", status: "active" })
    );
    bunExpect(second.status).toBe("duplicate");
    bunExpect(
      second.status === "duplicate" ? second.fieldErrors.status : ""
    ).toContain("already has an active plan");
  });

  bunTest("lets a plan stay active when it updates itself", () => {
    const plan = savedPlan({ status: "active" });
    bunExpect(
      trainingPlanRepository.update(
        plan.id,
        planInput({ status: "active", strategyNotes: "Revised." })
      ).status
    ).toBe("saved");
  });

  bunTest("reports not-found when updating an unknown plan", () => {
    bunExpect(
      trainingPlanRepository.update("missing", planInput()).status
    ).toBe("not-found");
  });
});

bunDescribe("training plan persistence", () => {
  bunTest("skips stored plans that no longer parse", () => {
    savedPlan();
    const stored: unknown[] = JSON.parse(
      globalThis.localStorage.getItem(STORAGE_KEY) ?? "[]"
    );
    globalThis.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...stored, { id: "broken" }, "not an object"])
    );

    // One corrupt record must not discard the rest of the season history.
    bunExpect(trainingPlanRepository.list()).toHaveLength(1);
  });

  bunTest("returns nothing when storage holds no plans", () => {
    bunExpect(trainingPlanRepository.list()).toEqual([]);
    bunExpect(trainingPlanRepository.get("missing")).toBeUndefined();
  });

  bunTest("sorts weeks by start date and trims free text", () => {
    const plan = savedPlan({
      strategyNotes: "  Build volume.  ",
      weeks: [week("2026-03-16"), week("2026-03-02")],
    });
    bunExpect(plan.weeks.map((item) => item.weekStart)).toEqual([
      "2026-03-02",
      "2026-03-16",
    ]);
    bunExpect(plan.strategyNotes).toBe("Build volume.");
  });

  bunTest("lists the most recent season first", () => {
    savedPlan({ endsOn: "2026-05-31", name: "Spring", startsOn: "2026-03-01" });
    savedPlan({
      endsOn: "2026-11-30",
      name: "Autumn",
      startsOn: "2026-09-01",
      weeks: [week("2026-09-07")],
    });
    bunExpect(trainingPlanRepository.list().map((plan) => plan.name)).toEqual([
      "Autumn",
      "Spring",
    ]);
  });
});
