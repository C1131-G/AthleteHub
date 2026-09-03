import "client-only";
import { readStoredArray, writeStored } from "@/lib/storage";

import {
  blankCycleSteps,
  monthlyCycleInputSchema,
  monthlyCycleSchema,
} from "./monthly-cycle-types";
import type {
  MonthlyAthleteCycle,
  MonthlyCycleInput,
  MonthlyCycleMutationResult,
  MonthlyCycleRepository,
} from "./monthly-cycle-types";

export const MONTHLY_CYCLE_STORAGE_KEY = "athletehub.monthly-cycles.v1";

/**
 * One malformed record is skipped, not fatal: a single broken cycle must not
 * remove the valid cycles a coach already confirmed.
 */
const parseCycle = (value: unknown): MonthlyAthleteCycle | undefined => {
  const result = monthlyCycleSchema.safeParse(value);
  return result.success ? result.data : undefined;
};

const readCycles = (): MonthlyAthleteCycle[] =>
  readStoredArray(MONTHLY_CYCLE_STORAGE_KEY)
    .map(parseCycle)
    .filter((cycle): cycle is MonthlyAthleteCycle => cycle !== undefined);

const writeCycles = (cycles: MonthlyAthleteCycle[]) => {
  return writeStored(MONTHLY_CYCLE_STORAGE_KEY, cycles);
};

/** One cycle per athlete per month, matched case-insensitively. */
const sameAthleteMonth = (
  cycle: MonthlyAthleteCycle,
  athleteId: string,
  month: string
) =>
  cycle.athleteId.toLowerCase() === athleteId.toLowerCase() &&
  cycle.month === month;

const findDuplicate = (
  cycles: MonthlyAthleteCycle[],
  athleteId: string,
  month: string,
  ignoreId?: string
) =>
  cycles.find(
    (cycle) =>
      cycle.id !== ignoreId && sameAthleteMonth(cycle, athleteId, month)
  );

const now = () => new Date().toISOString();

const normalizeInput = (input: MonthlyCycleInput): MonthlyCycleInput => ({
  ...input,
  steps: { ...blankCycleSteps(), ...input.steps },
});

export const monthlyCycleRepository: MonthlyCycleRepository = {
  create: (input): MonthlyCycleMutationResult => {
    const cycles = readCycles();
    const parsed = monthlyCycleInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        fieldErrors: { form: "The cycle data is invalid." },
        status: "invalid",
      };
    }
    const duplicate = findDuplicate(cycles, input.athleteId, input.month);
    if (duplicate) {
      return {
        fieldErrors: {
          month: "This athlete already has a cycle for that month.",
        },
        status: "duplicate",
      };
    }
    const cycle: MonthlyAthleteCycle = {
      ...normalizeInput(parsed.data),
      createdAt: now(),
      id: crypto.randomUUID(),
      updatedAt: now(),
    };
    if (!writeCycles([cycle, ...cycles])) {
      return {
        fieldErrors: { form: "Could not save the cycle on this device." },
        status: "storage-error",
      };
    }
    return { cycle, status: "saved" };
  },
  get: (cycleId) => readCycles().find((cycle) => cycle.id === cycleId),
  list: readCycles,
  update: (cycleId, input): MonthlyCycleMutationResult => {
    const cycles = readCycles();
    const existing = cycles.find((cycle) => cycle.id === cycleId);
    if (!existing) {
      return { fieldErrors: { form: "Cycle not found." }, status: "not-found" };
    }
    const parsed = monthlyCycleInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        fieldErrors: { form: "The cycle data is invalid." },
        status: "invalid",
      };
    }
    const duplicate = findDuplicate(
      cycles,
      input.athleteId,
      input.month,
      cycleId
    );
    if (duplicate) {
      return {
        fieldErrors: {
          month: "This athlete already has a cycle for that month.",
        },
        status: "duplicate",
      };
    }
    const updated: MonthlyAthleteCycle = {
      ...normalizeInput(parsed.data),
      createdAt: existing.createdAt,
      id: existing.id,
      updatedAt: now(),
    };
    if (
      !writeCycles(
        cycles.map((cycle) => (cycle.id === cycleId ? updated : cycle))
      )
    ) {
      return {
        fieldErrors: { form: "Could not save the cycle on this device." },
        status: "storage-error",
      };
    }
    return { cycle: updated, status: "saved" };
  },
};
