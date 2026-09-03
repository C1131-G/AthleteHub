import { readStoredArray, writeStored } from "@/lib/storage";

import {
  seasonTrainingPlanInputSchema,
  seasonTrainingPlanSchema,
} from "./training-plan-types";
import type {
  SeasonTrainingPlan,
  SeasonTrainingPlanInput,
  TrainingPlanMutationResult,
  TrainingPlanRepository,
} from "./training-plan-types";

const STORAGE_KEY = "athletehub.training-plans.v1";

// Keep every plan that still parses: one corrupt record must not discard the
// rest of the season history.
const readPlans = (): SeasonTrainingPlan[] =>
  readStoredArray(STORAGE_KEY).flatMap((value) => {
    const result = seasonTrainingPlanSchema.safeParse(value);
    return result.success ? [result.data] : [];
  });

const writePlans = (plans: SeasonTrainingPlan[]) =>
  writeStored(STORAGE_KEY, plans);

const sortedBySeason = (plans: SeasonTrainingPlan[]) =>
  plans.toSorted((a, b) =>
    `${b.startsOn}${b.createdAt}`.localeCompare(`${a.startsOn}${a.createdAt}`)
  );

const firstMessages = (error: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}) => {
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(error.flatten().fieldErrors)) {
    const [message] = messages;
    if (message) {
      errors[field] = message;
    }
  }
  return errors;
};

const clean = (input: SeasonTrainingPlanInput): SeasonTrainingPlanInput => ({
  ...input,
  events: input.events.map((event) => ({
    ...event,
    // A TBD event must not keep a stale date from an earlier edit.
    endsOn: event.dateStatus === "tbd" ? undefined : event.endsOn,
    location: event.location.trim(),
    name: event.name.trim(),
    notes: event.notes.trim(),
    startsOn: event.dateStatus === "tbd" ? undefined : event.startsOn,
  })),
  name: input.name.trim(),
  strategyNotes: input.strategyNotes.trim(),
  weeks: input.weeks
    .map((week) => ({ ...week, technicalFocus: week.technicalFocus.trim() }))
    .toSorted((a, b) => a.weekStart.localeCompare(b.weekStart)),
});

const validate = (input: SeasonTrainingPlanInput) => {
  const result = seasonTrainingPlanInputSchema.safeParse(clean(input));
  if (!result.success) {
    return { fieldErrors: firstMessages(result.error), valid: false as const };
  }
  return { input: result.data, valid: true as const };
};

/** One athlete may hold only one active plan at a time. */
const conflictsWith = (
  plans: SeasonTrainingPlan[],
  input: SeasonTrainingPlanInput,
  planId?: string | undefined
): Record<string, string> | undefined => {
  const others = plans.filter((plan) => plan.id !== planId);
  if (
    others.some(
      (plan) =>
        plan.athleteId === input.athleteId &&
        plan.name.toLowerCase() === input.name.toLowerCase()
    )
  ) {
    return { name: "This athlete already has a plan with that name." };
  }
  if (
    input.status === "active" &&
    others.some(
      (plan) => plan.athleteId === input.athleteId && plan.status === "active"
    )
  ) {
    return {
      status:
        "This athlete already has an active plan. Complete it before starting another.",
    };
  }
};

export const trainingPlanRepository: TrainingPlanRepository = {
  create: (input) => {
    const valid = validate(input);
    if (!valid.valid) {
      return { fieldErrors: valid.fieldErrors, status: "invalid" };
    }
    const plans = readPlans();
    const fieldErrors = conflictsWith(plans, valid.input);
    if (fieldErrors) {
      return { fieldErrors, status: "duplicate" };
    }
    const now = new Date().toISOString();
    const plan: SeasonTrainingPlan = {
      ...valid.input,
      createdAt: now,
      id: crypto.randomUUID(),
      updatedAt: now,
    };
    if (!writePlans([plan, ...plans])) {
      return {
        fieldErrors: { form: "Could not save the plan on this device." },
        status: "storage-error",
      };
    }
    return { plan, status: "saved" };
  },
  get: (planId) => readPlans().find((plan) => plan.id === planId),
  list: () => sortedBySeason(readPlans()),
  update: (planId, input): TrainingPlanMutationResult => {
    const valid = validate(input);
    if (!valid.valid) {
      return { fieldErrors: valid.fieldErrors, status: "invalid" };
    }
    const plans = readPlans();
    const existing = plans.find((plan) => plan.id === planId);
    if (!existing) {
      return {
        fieldErrors: { form: "Training plan not found." },
        status: "not-found",
      };
    }
    const fieldErrors = conflictsWith(plans, valid.input, planId);
    if (fieldErrors) {
      return { fieldErrors, status: "duplicate" };
    }
    const plan: SeasonTrainingPlan = {
      ...existing,
      ...valid.input,
      updatedAt: new Date().toISOString(),
    };
    if (!writePlans(plans.map((item) => (item.id === planId ? plan : item)))) {
      return {
        fieldErrors: { form: "Could not save the plan on this device." },
        status: "storage-error",
      };
    }
    return { plan, status: "saved" };
  },
};
