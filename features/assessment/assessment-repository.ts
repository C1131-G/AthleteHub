import "client-only";
import { readStoredArray, writeStored } from "@/lib/storage";

import { assessmentInputSchema, assessmentSchema } from "./assessment-types";
import type {
  Assessment,
  AssessmentInput,
  AssessmentMutationResult,
} from "./assessment-types";

const KEY = "athletehub.assessments.v1";
const fieldErrors = (error: {
  issues: { path: PropertyKey[]; message: string }[];
}) => {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    result[issue.path.map(String).join(".") || "form"] ??= issue.message;
  }
  return result;
};
const read = () =>
  readStoredArray(KEY).flatMap((value) => {
    const parsed = assessmentSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
const invalid = (errors: Record<string, string>): AssessmentMutationResult => ({
  fieldErrors: errors,
  status: "invalid",
});
const persist = (
  assessment: Assessment,
  next: Assessment[]
): AssessmentMutationResult =>
  writeStored(KEY, next)
    ? { assessment, status: "saved" }
    : {
        fieldErrors: {
          form: "Assessment could not be saved. Check local storage access and try again.",
        },
        status: "storage-error",
      };
const sorted = (records: Assessment[]) =>
  records.toSorted((a, b) =>
    `${b.assessedOn}${b.createdAt}${b.id}`.localeCompare(
      `${a.assessedOn}${a.createdAt}${a.id}`
    )
  );

export const assessmentRepository = {
  create: (input: AssessmentInput): AssessmentMutationResult => {
    const parsed = assessmentInputSchema.safeParse(input);
    if (!parsed.success) {
      return invalid(fieldErrors(parsed.error));
    }
    const records = read();
    const now = new Date().toISOString();
    const assessment = {
      ...parsed.data,
      createdAt: now,
      id: crypto.randomUUID(),
      updatedAt: now,
    } satisfies Assessment;
    return persist(assessment, [assessment, ...records]);
  },
  get: (id: string) => read().find((record) => record.id === id),
  list: () => sorted(read()),
  update: (id: string, input: AssessmentInput): AssessmentMutationResult => {
    const parsed = assessmentInputSchema.safeParse(input);
    if (!parsed.success) {
      return invalid(fieldErrors(parsed.error));
    }
    const records = read();
    const existing = records.find((record) => record.id === id);
    if (!existing) {
      return {
        fieldErrors: { form: "Assessment not found." },
        status: "not-found",
      };
    }
    const updated = {
      ...existing,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    } satisfies Assessment;
    return writeStored(
      KEY,
      records.map((record) => (record.id === id ? updated : record))
    )
      ? { assessment: updated, status: "saved" }
      : {
          fieldErrors: {
            form: "Assessment could not be saved. Check local storage access and try again.",
          },
          status: "storage-error",
        };
  },
};
