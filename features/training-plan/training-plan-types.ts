import { z } from "zod";

export const trainingPlanStatuses = ["draft", "active", "completed"] as const;
export const eventPriorities = ["primary", "secondary", "development"] as const;
export const eventDateStatuses = ["scheduled", "tbd"] as const;

export const trainingPlanStatusSchema = z.enum(trainingPlanStatuses);
export const eventPrioritySchema = z.enum(eventPriorities);
export const eventDateStatusSchema = z.enum(eventDateStatuses);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
    return parsed.toISOString().slice(0, 10) === value;
  }, "Use a real calendar date.");
const positiveInt = z.number().int().positive();

export const trainingPlanWeekSchema = z.object({
  arrowsPlanned: positiveInt,
  id: z.string().min(1),
  technicalFocus: z.string(),
  trainingDaysPlanned: z.number().int().min(1).max(7),
  weekStart: isoDate,
});

export const trainingPlanEventSchema = z
  .object({
    dateStatus: eventDateStatusSchema,
    endsOn: isoDate.optional(),
    id: z.string().min(1),
    location: z.string(),
    name: z.string().min(1, "Every event needs a name."),
    notes: z.string(),
    priority: eventPrioritySchema,
    startsOn: isoDate.optional(),
  })
  .superRefine((event, context) => {
    if (event.dateStatus === "scheduled" && !event.startsOn) {
      context.addIssue({
        code: "custom",
        message: "A scheduled event needs a start date.",
        path: ["startsOn"],
      });
    }
    if (event.endsOn && event.startsOn && event.endsOn < event.startsOn) {
      context.addIssue({
        code: "custom",
        message: "The end date cannot be before the start date.",
        path: ["endsOn"],
      });
    }
  });

export const seasonTrainingPlanSchema = z.object({
  athleteId: z.string().min(1),
  createdAt: z.string(),
  endsOn: isoDate,
  events: z.array(trainingPlanEventSchema),
  id: z.string().min(1),
  name: z.string().min(1),
  startsOn: isoDate,
  status: trainingPlanStatusSchema,
  strategyNotes: z.string(),
  targetDistanceM: positiveInt.optional(),
  targetScore: positiveInt.optional(),
  updatedAt: z.string(),
  weeks: z.array(trainingPlanWeekSchema),
});

export const seasonTrainingPlanInputSchema = seasonTrainingPlanSchema
  .omit({ createdAt: true, id: true, updatedAt: true })
  .superRefine((plan, context) => {
    if (plan.endsOn < plan.startsOn) {
      context.addIssue({
        code: "custom",
        message: "The season end date cannot be before the start date.",
        path: ["endsOn"],
      });
    }
    if (plan.weeks.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Add at least one planned week.",
        path: ["weeks"],
      });
    }
    const seen = new Set<string>();
    for (const week of plan.weeks) {
      if (seen.has(week.weekStart)) {
        context.addIssue({
          code: "custom",
          message: `Week ${week.weekStart} is listed more than once.`,
          path: ["weeks"],
        });
      }
      seen.add(week.weekStart);
      if (week.weekStart < plan.startsOn || week.weekStart > plan.endsOn) {
        context.addIssue({
          code: "custom",
          message: `Week ${week.weekStart} falls outside the season.`,
          path: ["weeks"],
        });
      }
    }
  });

export type TrainingPlanStatus = z.infer<typeof trainingPlanStatusSchema>;
export type EventPriority = z.infer<typeof eventPrioritySchema>;
export type EventDateStatus = z.infer<typeof eventDateStatusSchema>;
export type TrainingPlanWeek = z.infer<typeof trainingPlanWeekSchema>;
export type TrainingPlanEvent = z.infer<typeof trainingPlanEventSchema>;
export type SeasonTrainingPlan = z.infer<typeof seasonTrainingPlanSchema>;
export type SeasonTrainingPlanInput = z.infer<
  typeof seasonTrainingPlanInputSchema
>;

export type TrainingPlanMutationResult =
  | { plan: SeasonTrainingPlan; status: "saved" }
  | {
      fieldErrors: Record<string, string>;
      status: "duplicate" | "invalid" | "not-found" | "storage-error";
    };

export interface TrainingPlanRepository {
  create: (input: SeasonTrainingPlanInput) => TrainingPlanMutationResult;
  get: (planId: string) => SeasonTrainingPlan | undefined;
  list: () => SeasonTrainingPlan[];
  update: (
    planId: string,
    input: SeasonTrainingPlanInput
  ) => TrainingPlanMutationResult;
}

export const statusLabel = {
  active: "Active",
  completed: "Completed",
  draft: "Draft",
} satisfies Record<TrainingPlanStatus, string>;

export const priorityLabel = {
  development: "Development",
  primary: "Primary",
  secondary: "Secondary",
} satisfies Record<EventPriority, string>;
