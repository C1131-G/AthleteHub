import { z } from "zod";

export const monthlyCycleSteps = [
  "profile",
  "equipment",
  "weekly",
  "monthly-average",
  "training-load",
  "conditioning",
  "review",
] as const;

export type MonthlyCycleStep = (typeof monthlyCycleSteps)[number];

/** `stale` is never persisted; the lifecycle derives it from source versions. */
export const monthlyCycleStepStatuses = [
  "pending",
  "complete",
  "exception",
  "stale",
] as const;

export type MonthlyCycleStepStatus = (typeof monthlyCycleStepStatuses)[number];

/** Statuses that may be written to storage; `stale` is derived at read time. */
const persistedStepStatuses = ["pending", "complete", "exception"] as const;

export const monthlyCycleStates = [
  "not-started",
  "in-progress",
  "complete",
] as const;

export type MonthlyCycleState = (typeof monthlyCycleStates)[number];

export const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Use a valid month.")
  .refine((value) => {
    const [year, month] = value.split("-").map(Number);
    return (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      (month ?? 0) >= 1 &&
      (month ?? 0) <= 12
    );
  }, "Use a real calendar month.");

export const cycleSourceReferenceSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type CycleSourceReference = z.infer<typeof cycleSourceReferenceSchema>;

export const monthlyCycleStepStateSchema = z.object({
  confirmedAt: z.string().optional(),
  reason: z.string().optional(),
  sources: z.array(cycleSourceReferenceSchema),
  status: z.enum(persistedStepStatuses),
});

const persistedStepsSchema = z.record(z.string(), monthlyCycleStepStateSchema);

/**
 * Persisted step maps may miss keys (older records, partial writes); every
 * canonical step is filled with a pending state so the type stays exhaustive.
 */
const stepsSchema = persistedStepsSchema.transform((persisted) => {
  const steps = blankCycleSteps();
  for (const step of monthlyCycleSteps) {
    const state = persisted[step];
    if (state) {
      steps[step] = state;
    }
  }
  return steps;
});

export const monthlyCycleSchema = z.object({
  athleteId: z.string().min(1),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  id: z.string().min(1),
  lastVisitedStep: z.enum(monthlyCycleSteps),
  month: monthSchema,
  status: z.enum(monthlyCycleStates),
  steps: stepsSchema,
  updatedAt: z.string(),
});

export interface MonthlyCycleStepState {
  status: MonthlyCycleStepStatus;
  confirmedAt?: string | undefined;
  reason?: string | undefined;
  sources: CycleSourceReference[];
}

export interface MonthlyAthleteCycle {
  athleteId: string;
  completedAt?: string | undefined;
  createdAt: string;
  id: string;
  lastVisitedStep: MonthlyCycleStep;
  month: string;
  status: MonthlyCycleState;
  steps: Record<MonthlyCycleStep, MonthlyCycleStepState>;
  updatedAt: string;
}

export const pendingStepState = (): MonthlyCycleStepState => ({
  sources: [],
  status: "pending",
});

export const blankCycleSteps = () =>
  ({
    conditioning: pendingStepState(),
    equipment: pendingStepState(),
    "monthly-average": pendingStepState(),
    profile: pendingStepState(),
    review: pendingStepState(),
    "training-load": pendingStepState(),
    weekly: pendingStepState(),
  }) satisfies Record<MonthlyCycleStep, MonthlyCycleStepState>;

export type MonthlyCycleInput = Omit<
  MonthlyAthleteCycle,
  "createdAt" | "id" | "updatedAt"
>;

export const monthlyCycleInputSchema = monthlyCycleSchema
  .omit({ createdAt: true, id: true, updatedAt: true })
  .transform(({ steps, ...rest }) => ({ ...rest, steps }));

export type MonthlyCycleMutationResult =
  | { cycle: MonthlyAthleteCycle; status: "saved" }
  | {
      fieldErrors: Record<string, string>;
      status: "duplicate" | "invalid" | "not-found" | "storage-error";
    };

export interface MonthlyCycleRepository {
  create: (input: MonthlyCycleInput) => MonthlyCycleMutationResult;
  get: (cycleId: string) => MonthlyAthleteCycle | undefined;
  list: () => MonthlyAthleteCycle[];
  update: (
    cycleId: string,
    input: MonthlyCycleInput
  ) => MonthlyCycleMutationResult;
}

/** Queue-level states derived from cycle + domain data, never persisted. */
export const cycleQueueStates = [
  "not-started",
  "in-progress",
  "needs-attention",
  "complete",
] as const;

export type CycleQueueState = (typeof cycleQueueStates)[number];
