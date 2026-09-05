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
  // Set when the format came from the round catalogue; absent for freehand.
  // Persisted inside the format snapshot so no column migration is needed.
  roundId: z.string().min(1).optional(),
  targetFaceCm: z.number().positive(),
});

export const sessionArrowInputSchema = z.object({
  score: z.number().int().nonnegative(),
  // Normalised -1…1 on the target face; null/absent when scored but un-plotted.
  x: z.number().min(-1).max(1).nullable().optional(),
  y: z.number().min(-1).max(1).nullable().optional(),
});

export const sessionEndInputSchema = z.object({
  arrowCount: z.number().int().positive(),
  // Optional so freehand scoring stays arrows-only; present arrows must fully
  // describe the end (see the refine on sessionInputSchema).
  arrows: z.array(sessionArrowInputSchema).optional(),
  score: z.number().int().nonnegative(),
});

export const sessionInputSchema = z
  .object({
    actualArrows: z.number().int().nonnegative().optional(),
    athleteId: z.string().min(1),
    date: dateOnlySchema,
    // Session load (Foster sRPE inputs); absent on pre-load sessions.
    durationMin: z.number().int().positive().optional(),
    ends: z.array(sessionEndInputSchema),
    equipmentSetupId: z.string().min(1).optional(),
    format: sessionFormatSchema,
    id: z.string().min(1),
    kind: z.enum(sessionKinds),
    notes: z.string(),
    plannedArrows: z.number().int().nonnegative().optional(),
    rpe: z.number().int().min(1).max(10).optional(),
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
      if (end.arrows === undefined) {
        continue;
      }
      if (end.arrows.length !== end.arrowCount) {
        context.addIssue({
          code: "custom",
          message: "An end's arrows must match its arrow count.",
          path: ["ends", index, "arrows"],
        });
      }
      const arrowScoreTotal = end.arrows.reduce(
        (total, arrow) => total + arrow.score,
        0
      );
      if (arrowScoreTotal !== end.score) {
        context.addIssue({
          code: "custom",
          message: "An end's arrow scores must add up to the end score.",
          path: ["ends", index, "arrows"],
        });
      }
      for (const [arrowIndex, arrow] of end.arrows.entries()) {
        if (arrow.score > input.format.maxScorePerArrow) {
          context.addIssue({
            code: "custom",
            message: "An arrow score exceeds the format maximum.",
            path: ["ends", index, "arrows", arrowIndex, "score"],
          });
        }
      }
    }
  });

export type SessionInput = z.infer<typeof sessionInputSchema>;
export type SessionArrowInput = z.infer<typeof sessionArrowInputSchema>;
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
