import { z } from "zod";

const wellnessRating = z.number().int().min(1).max(10);

export const wellnessSchema = z.object({
  athleteId: z.string().min(1),
  // 1 (worst) to 10 (best) for sleep and mood; 1 (best) to 10 (worst) for
  // soreness, fatigue, and stress — each is recorded exactly as the athlete
  // reports it and the UI explains the direction.
  createdAt: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date."),
  fatigue: wellnessRating,
  id: z.string().min(1),
  mood: wellnessRating,
  note: z.string(),
  sleep: wellnessRating,
  soreness: wellnessRating,
  stress: wellnessRating,
  updatedAt: z.string().min(1),
});

export const wellnessInputSchema = wellnessSchema.omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export type Wellness = z.infer<typeof wellnessSchema>;
export type WellnessInput = z.infer<typeof wellnessInputSchema>;
