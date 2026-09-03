import {
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { createMemoryStorage } from "@/lib/test/memory-storage";

import {
  MONTHLY_CYCLE_STORAGE_KEY,
  monthlyCycleRepository,
} from "./monthly-cycle-repository";
import { blankCycleSteps } from "./monthly-cycle-types";
import type { MonthlyCycleInput } from "./monthly-cycle-types";

bunBeforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

const cycleInput = (
  overrides: Partial<MonthlyCycleInput> = {}
): MonthlyCycleInput => ({
  athleteId: "athlete-1",
  lastVisitedStep: "profile",
  month: "2026-08",
  status: "not-started",
  steps: blankCycleSteps(),
  ...overrides,
});

bunDescribe("monthly cycle repository", () => {
  bunTest("creates and reads a cycle", () => {
    const result = monthlyCycleRepository.create(cycleInput());
    bunExpect(result.status).toBe("saved");
    if (result.status !== "saved") {
      return;
    }
    bunExpect(result.cycle.id).toBeTruthy();
    bunExpect(monthlyCycleRepository.get(result.cycle.id)?.month).toBe(
      "2026-08"
    );
    bunExpect(monthlyCycleRepository.list()).toHaveLength(1);
  });

  bunTest("enforces one cycle per athlete and month", () => {
    monthlyCycleRepository.create(cycleInput());
    const duplicate = monthlyCycleRepository.create(cycleInput());
    bunExpect(duplicate.status).toBe("duplicate");
    bunExpect(monthlyCycleRepository.list()).toHaveLength(1);
  });

  bunTest("matching is case-insensitive on athlete id", () => {
    monthlyCycleRepository.create(cycleInput({ athleteId: "athlete-1" }));
    const duplicate = monthlyCycleRepository.create(
      cycleInput({ athleteId: "ATHLETE-1" })
    );
    bunExpect(duplicate.status).toBe("duplicate");
  });

  bunTest("the same athlete may have cycles in different months", () => {
    monthlyCycleRepository.create(cycleInput({ month: "2026-08" }));
    const other = monthlyCycleRepository.create(
      cycleInput({ month: "2026-09" })
    );
    bunExpect(other.status).toBe("saved");
  });

  bunTest("update preserves identity and timestamps", () => {
    const created = monthlyCycleRepository.create(cycleInput());
    if (created.status !== "saved") {
      return;
    }
    const result = monthlyCycleRepository.update(created.cycle.id, {
      ...cycleInput(),
      lastVisitedStep: "weekly",
      status: "in-progress",
    });
    bunExpect(result.status).toBe("saved");
    if (result.status !== "saved") {
      return;
    }
    bunExpect(result.cycle.createdAt).toBe(created.cycle.createdAt);
    bunExpect(result.cycle.lastVisitedStep).toBe("weekly");
    bunExpect(monthlyCycleRepository.get(created.cycle.id)?.status).toBe(
      "in-progress"
    );
  });

  bunTest("update reports a not-found cycle", () => {
    const result = monthlyCycleRepository.update("missing", cycleInput());
    bunExpect(result.status).toBe("not-found");
  });

  bunTest("update keeps the unique athlete-month rule", () => {
    const first = monthlyCycleRepository.create(cycleInput());
    const second = monthlyCycleRepository.create(
      cycleInput({ month: "2026-09" })
    );
    if (first.status !== "saved" || second.status !== "saved") {
      return;
    }
    const clash = monthlyCycleRepository.update(second.cycle.id, {
      ...cycleInput(),
    });
    bunExpect(clash.status).toBe("duplicate");
  });

  bunTest("a malformed persisted record is skipped, not fatal", () => {
    const good = monthlyCycleRepository.create(cycleInput());
    if (good.status !== "saved") {
      return;
    }
    globalThis.localStorage.setItem(
      MONTHLY_CYCLE_STORAGE_KEY,
      JSON.stringify([
        { id: "broken", month: "not-a-month" },
        { id: "also-broken" },
        null,
        good.cycle,
      ])
    );
    const cycles = monthlyCycleRepository.list();
    bunExpect(cycles).toHaveLength(1);
    bunExpect(cycles[0]?.id).toBe(good.cycle.id);
  });

  bunTest("persisted steps missing keys are filled with pending state", () => {
    const good = monthlyCycleRepository.create(cycleInput());
    if (good.status !== "saved") {
      return;
    }
    const partial = {
      ...good.cycle,
      steps: { profile: { sources: [], status: "complete" } },
    };
    globalThis.localStorage.setItem(
      MONTHLY_CYCLE_STORAGE_KEY,
      JSON.stringify([partial])
    );
    const restored = monthlyCycleRepository.get(good.cycle.id);
    bunExpect(restored?.steps.profile?.status).toBe("complete");
    bunExpect(restored?.steps.review?.status).toBe("pending");
    bunExpect(Object.keys(restored?.steps ?? {})).toHaveLength(7);
  });
});
