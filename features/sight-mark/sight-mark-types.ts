import { z } from "zod";

export const sightMarkSchema = z.object({
  arrow: z.string().min(1),
  athleteId: z.string().min(1),
  bow: z.string().min(1),
  createdAt: z.string().min(1),
  distanceM: z.number().positive(),
  id: z.string().min(1),
  mark: z.string().min(1),
  note: z.string(),
  updatedAt: z.string().min(1),
});

export const sightMarkInputSchema = sightMarkSchema.omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export type SightMark = z.infer<typeof sightMarkSchema>;
export type SightMarkInput = z.infer<typeof sightMarkInputSchema>;
