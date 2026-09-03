import { z } from "zod";

export const sessionKinds = ["practice", "competition"] as const;
export const sessionStatuses = ["draft", "complete"] as const;

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    if (year === undefined || month === undefined || day === undefined) {
      return false;
    }
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }, "Use a real calendar date.");

export const sessionFormatSchema = z.object({
  arrowsPerEnd: z.number().int().positive(),
  bowCategory: z.enum(["recurve", "compound", "barebow"]),
  distanceM: z.number().positive(),
  indoor: z.boolean(),
  maxScorePerArrow: z.number().int().positive(),
  targetFaceCm: z.number().positive(),
});

export const sessionEndInputSchema = z.object({
  arrowCount: z.number().int().positive(),
  score: z.number().int().nonnegative(),
});

export const sessionInputSchema = z
  .object({
    actualArrows: z.number().int().nonnegative().optional(),
    athleteId: z.string().min(1),
    date: dateOnlySchema,
    ends: z.array(sessionEndInputSchema),
    equipmentSetupId: z.string().min(1).optional(),
    format: sessionFormatSchema,
    id: z.string().min(1),
    kind: z.enum(sessionKinds),
    notes: z.string(),
    plannedArrows: z.number().int().nonnegative().optional(),
    technicalFocus: z.string(),
  })
  .superRefine((input, context) => {
    for (const [index, end] of input.ends.entries()) {
      if (end.arrowCount > input.format.arrowsPerEnd) {
        context.addIssue({
          code: "custom",
          message: "An end cannot contain more arrows than the format allows.",
          path: ["ends", index, "arrowCount"],
        });
      }
      if (end.score > end.arrowCount * input.format.maxScorePerArrow) {
        context.addIssue({
          code: "custom",
          message: "The end score exceeds its scoring capacity.",
          path: ["ends", index, "score"],
        });
      }
    }
  });

export type SessionInput = z.infer<typeof sessionInputSchema>;
export type SessionEndInput = z.infer<typeof sessionEndInputSchema>;
export type SessionFormat = z.infer<typeof sessionFormatSchema>;

export interface ArcherySession extends SessionInput {
  createdAt: string;
  status: (typeof sessionStatuses)[number];
  updatedAt: string;
}

export type SessionMutationResult =
  | { session: ArcherySession; status: "saved" }
  | { fieldErrors: Record<string, string>; status: "invalid" };

export const sessionResponseSchema = sessionInputSchema.extend({
  createdAt: z.iso.datetime(),
  status: z.enum(sessionStatuses),
  updatedAt: z.iso.datetime(),
});
