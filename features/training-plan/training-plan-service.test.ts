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
import { createTrainingPlanService } from "./training-plan-service";
import type { TrainingPlanService } from "./training-plan-service";
import type {
  SeasonTrainingPlanInput,
  TrainingPlanWeek,
} from "./training-plan-types";

let directory: string;
let database: DatabaseContext;
let service: TrainingPlanService;

bunBeforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "athletehub-tplan-"));
  database = await createDatabaseContext({
    databaseUrl: `file:${path.join(directory, "athletehub.db")}`,
  });
  service = createTrainingPlanService(database.collections);
});

bunAfterEach(async () => {
  await database.close();
  await removeDirectory(directory);
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

const savedPlan = async (overrides: Partial<SeasonTrainingPlanInput> = {}) => {
  const result = await service.create(planInput(overrides));
  if (result.status !== "saved") {
    throw new Error(`expected a saved plan, got ${result.status}`);
  }
  return result.record;
};

bunDescribe("training plan schema", () => {
  bunTest("rejects a season that ends before it starts", async () => {
    const result = await service.create(planInput({ endsOn: "2026-02-01" }));
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.endsOn : ""
    ).toContain("cannot be before");
  });

  bunTest("rejects a plan with no weeks", async () => {
    const result = await service.create(planInput({ weeks: [] }));
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.weeks : ""
    ).toBeTruthy();
  });

  bunTest("rejects two weeks with the same start date", async () => {
    const result = await service.create(
      planInput({
        weeks: [week("2026-03-02"), week("2026-03-02", { id: "w-dup" })],
      })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.weeks : ""
    ).toContain("more than once");
  });

  bunTest("rejects a week outside the season range", async () => {
    const result = await service.create(
      planInput({ weeks: [week("2026-08-03")] })
    );
    bunExpect(result.status).toBe("invalid");
    bunExpect(
      result.status === "invalid" ? result.fieldErrors.weeks : ""
    ).toContain("outside the season");
  });

  bunTest(
    "rejects arrow targets that are not positive whole numbers",
    async () => {
      bunExpect(
        await statusOf(
          service.create(
            planInput({ weeks: [week("2026-03-02", { arrowsPlanned: 0 })] })
          )
        )
      ).toBe("invalid");
      bunExpect(
        await statusOf(
          service.create(
            planInput({ weeks: [week("2026-03-02", { arrowsPlanned: 12.5 })] })
          )
        )
      ).toBe("invalid");
    }
  );

  bunTest("rejects planned training days outside 1 to 7", async () => {
    bunExpect(
      await statusOf(
        service.create(
          planInput({ weeks: [week("2026-03-02", { trainingDaysPlanned: 0 })] })
        )
      )
    ).toBe("invalid");
    bunExpect(
      await statusOf(
        service.create(
          planInput({ weeks: [week("2026-03-02", { trainingDaysPlanned: 8 })] })
        )
      )
    ).toBe("invalid");
  });

  bunTest(
    "rejects a target distance or score that is not positive",
    async () => {
      bunExpect(
        await statusOf(service.create(planInput({ targetDistanceM: 0 })))
      ).toBe("invalid");
      bunExpect(
        await statusOf(service.create(planInput({ targetScore: -10 })))
      ).toBe("invalid");
    }
  );
});

bunDescribe("training plan events", () => {
  bunTest("requires a start date for a scheduled event", async () => {
    const result = await service.create(
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

  bunTest("accepts a to-be-decided event with no dates", async () => {
    const plan = await savedPlan({
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

  bunTest(
    "drops dates carried over when an event becomes undecided",
    async () => {
      const plan = await savedPlan({
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
    }
  );

  bunTest("rejects an event that ends before it starts", async () => {
    const result = await service.create(
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

  bunTest("requires a name on every event", async () => {
    const result = await service.create(
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
  bunTest(
    "rejects a second plan with the same name for one athlete",
    async () => {
      await savedPlan();
      const duplicate = await service.create(planInput());
      bunExpect(duplicate.status).toBe("duplicate");
      bunExpect(
        duplicate.status === "duplicate" ? duplicate.fieldErrors.name : ""
      ).toContain("already has a plan");
    }
  );

  bunTest("allows the same plan name for a different athlete", async () => {
    await savedPlan();
    bunExpect(
      await statusOf(service.create(planInput({ athleteId: "a2" })))
    ).toBe("saved");
  });

  bunTest("allows only one active plan per athlete", async () => {
    await savedPlan({ name: "Season A", status: "active" });
    const second = await service.create(
      planInput({ name: "Season B", status: "active" })
    );
    bunExpect(second.status).toBe("duplicate");
    bunExpect(
      second.status === "duplicate" ? second.fieldErrors.status : ""
    ).toContain("already has an active plan");
  });

  bunTest("lets a plan stay active when it updates itself", async () => {
    const plan = await savedPlan({ status: "active" });
    bunExpect(
      await statusOf(
        service.update(
          plan.id,
          planInput({ status: "active", strategyNotes: "Revised." })
        )
      )
    ).toBe("saved");
  });

  bunTest("reports not-found when updating an unknown plan", async () => {
    bunExpect(await statusOf(service.update("missing", planInput()))).toBe(
      "not-found"
    );
  });
});

bunDescribe("training plan persistence", () => {
  bunTest("returns nothing when storage holds no plans", async () => {
    bunExpect(await service.list()).toEqual([]);
    bunExpect(await service.get("missing")).toBeUndefined();
  });

  bunTest("sorts weeks by start date and trims free text", async () => {
    const plan = await savedPlan({
      strategyNotes: "  Build volume.  ",
      weeks: [week("2026-03-16"), week("2026-03-02")],
    });
    bunExpect(plan.weeks.map((item) => item.weekStart)).toEqual([
      "2026-03-02",
      "2026-03-16",
    ]);
    bunExpect(plan.strategyNotes).toBe("Build volume.");
  });

  bunTest("lists the most recent season first", async () => {
    await savedPlan({
      endsOn: "2026-05-31",
      name: "Spring",
      startsOn: "2026-03-01",
    });
    await savedPlan({
      endsOn: "2026-11-30",
      name: "Autumn",
      startsOn: "2026-09-01",
      weeks: [week("2026-09-07")],
    });
    const plans = await service.list();
    bunExpect(plans.map((plan) => plan.name)).toEqual(["Autumn", "Spring"]);
  });
});
