import { z } from "zod";

export const athleteStatuses = ["active", "medical-leave", "inactive"] as const;
export const bowCategories = ["recurve", "compound", "barebow"] as const;

export const athleteStatusSchema = z.enum(athleteStatuses);
export const bowCategorySchema = z.enum(bowCategories);

export type AthleteStatus = z.infer<typeof athleteStatusSchema>;
export type BowCategory = z.infer<typeof bowCategorySchema>;

const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
    return date.toISOString().slice(0, 10) === value;
  }, "Use a real calendar date.");

const optionalMeasure = z.number().finite().positive().optional();

export const athleteSchema = z.object({
  armSpanCm: optionalMeasure,
  athleteId: z.string().min(1),
  category: bowCategorySchema,
  createdAt: z.string().min(1),
  dateOfBirth: localDate,
  equipmentNotes: z.string(),
  fullName: z.string().min(1),
  heightCm: optionalMeasure,
  id: z.string().min(1),
  photoUrl: z.string().optional(),
  status: athleteStatusSchema,
  targetDistanceM: optionalMeasure,
  targetScore: optionalMeasure,
  technicalFocus: z.string(),
  updatedAt: z.string().min(1),
  weightKg: optionalMeasure,
});

export const athleteInputSchema = athleteSchema.omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export type Athlete = z.infer<typeof athleteSchema>;
export type AthleteInput = z.infer<typeof athleteInputSchema>;
