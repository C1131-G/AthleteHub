"use client";

import { FloppyDiskIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AthletePicker } from "@/features/athlete/athlete-picker";
import { useAthletes } from "@/features/athlete/use-athletes";

import { conditioningHref } from "../conditioning-routes";
import {
  assessmentStatusLabel,
  toAssessmentStatus,
} from "../conditioning-types";
import { useConditioning } from "../use-conditioning";
import { AssessmentResultsEditor } from "./assessment-results-editor";
import { errorId, focusFirstError } from "./conditioning-form-errors";
import type { ConditioningFormErrors } from "./conditioning-form-errors";
import {
  createAssessmentDraft,
  emptyResultDraft,
  presetResultDraft,
  toAssessmentInput,
} from "./conditioning-form-state";
import type { AssessmentFormState } from "./conditioning-form-state";

// SAFETY: Object.entries preserves the label map's exact key union.
const statusChoices = (
  Object.entries(assessmentStatusLabel) as [
    keyof typeof assessmentStatusLabel,
    string,
  ][]
).map(([value, label]) => ({ label, value }));

const numberValue = (draft: { unit: string; valueText: string }) => {
  if (draft.unit === "seconds") {
    if (draft.valueText.includes(":")) {
      const match = /^(?<minutes>\d+):(?<seconds>[0-5]?\d)$/.exec(
        draft.valueText
      );
      return match
        ? Number(match.groups?.minutes) * 60 + Number(match.groups?.seconds)
        : Number.NaN;
    }
    return Number(draft.valueText);
  }
  return Number(draft.valueText);
};

const validateResult = (
  result: AssessmentFormState["results"][number],
  errors: ConditioningFormErrors
) => {
  const prefix = `result-${result.id}`;
  if (result.category === "custom" && !result.label.trim()) {
    errors[`${prefix}-label`] = "A custom test needs a label.";
  }
  const value = numberValue(result);
  if (!result.valueText.trim() || Number.isNaN(value) || value <= 0) {
    errors[`${prefix}-value`] = "Enter a value greater than zero.";
  }
  if (result.unit === "custom" && !result.customUnit.trim()) {
    errors[`${prefix}-unit-label`] = "Name the custom unit.";
  }
  if (result.category === "custom" && !result.protocol.trim()) {
    errors[`${prefix}-protocol`] = "Describe the test protocol.";
  }
};

const validateResults = (
  results: AssessmentFormState["results"],
  errors: ConditioningFormErrors
) => {
  const seenLabels = new Set<string>();
  for (const result of results) {
    validateResult(result, errors);
    const label = result.label.trim().toLowerCase();
    if (label) {
      if (seenLabels.has(label)) {
        errors["assessment-results"] =
          "Each test can only appear once per assessment.";
      }
      seenLabels.add(label);
    }
  }
};

const validate = (
  form: AssessmentFormState,
  duplicateAthleteDate: boolean
): ConditioningFormErrors => {
  const errors: ConditioningFormErrors = {};
  if (!form.athleteId) {
    errors["assessment-athlete"] = "Select an athlete.";
  }
  if (!form.assessedOn) {
    errors["assessment-date"] = "Choose an assessment date.";
  } else if (form.assessedOn > new Date().toISOString().slice(0, 10)) {
    errors["assessment-date"] = "Assessment date cannot be in the future.";
  }
  if (duplicateAthleteDate) {
    errors["assessment-date"] =
      "An assessment already exists for this athlete on this date.";
  }
  if (form.status === "completed" && form.results.length === 0) {
    errors["assessment-results"] =
      "A completed assessment needs at least one test result.";
  }
  if (
    (form.status === "medical-exemption" || form.status === "absent") &&
    !form.coachSummary.trim()
  ) {
    errors["assessment-summary"] =
      "A medical exemption or absence needs an explanatory note.";
  }
  validateResults(form.results, errors);
  return errors;
};

export const AssessmentForm = ({
  assessmentId,
}: {
  assessmentId?: string | undefined;
}) => {
  const { ready: athletesReady } = useAthletes();
  const { ready: conditioningReady } = useConditioning();
  const params = useSearchParams();
  if (!(athletesReady && conditioningReady)) {
    return <AssessmentFormSkeleton />;
  }
  return (
    <AssessmentFormBody
      assessmentId={assessmentId}
      initialAthleteId={params.get("athleteId") ?? ""}
    />
  );
};

const AssessmentFormBody = ({
  assessmentId,
  initialAthleteId,
}: {
  assessmentId?: string | undefined;
  initialAthleteId: string;
}) => {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const { athletes } = useAthletes();
  const { assessments, createAssessment, getAssessment, updateAssessment } =
    useConditioning();
  const existing = assessmentId ? getAssessment(assessmentId) : undefined;
  const [form, setForm] = useState<AssessmentFormState>(() =>
    createAssessmentDraft(
      existing?.athleteId ??
        params.get("athleteId") ??
        initialAthleteId ??
        athletes[0]?.id ??
        "",
      existing
    )
  );
  const [errors, setErrors] = useState<ConditioningFormErrors>({});

  if (assessmentId && !existing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assessment not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} href={conditioningHref()}>
            Back to conditioning
          </Link>
        </CardContent>
      </Card>
    );
  }

  const update = (patch: Partial<AssessmentFormState>) =>
    setForm((current) => ({ ...current, ...patch }));
  const duplicateAthleteDate = assessments.some(
    (assessment) =>
      assessment.id !== assessmentId &&
      assessment.athleteId === form.athleteId &&
      assessment.assessedOn === form.assessedOn
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(form, duplicateAthleteDate);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }
    const input = toAssessmentInput(form);
    startTransition(() => {
      const result = assessmentId
        ? updateAssessment(assessmentId, input)
        : createAssessment(input);
      if (result.status === "saved") {
        router.push(`/conditioning/assessments/${result.record.id}`);
      } else {
        setErrors(result.fieldErrors);
        focusFirstError(result.fieldErrors);
      }
    });
  };

  return (
    <form className="space-y-6" noValidate onSubmit={submit}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">
            {assessmentId ? "Edit assessment" : "New assessment"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Ratings are coach-selected; no automatic benchmarks are applied.
          </p>
        </div>
        <Link
          className={buttonVariants({ variant: "ghost" })}
          href={conditioningHref()}
        >
          Cancel
        </Link>
      </div>
      {Object.keys(errors).length > 0 && (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4"
          role="alert"
        >
          <p className="font-medium">Check the assessment before saving.</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Assessment details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="assessment-athlete">Athlete</FieldLabel>
            <AthletePicker
              id="assessment-athlete"
              value={form.athleteId}
              onChange={(value) => update({ athleteId: value })}
            />
            <FieldError id={errorId("assessment-athlete")}>
              {errors["assessment-athlete"]}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="assessment-date">Assessed on</FieldLabel>
            <DatePicker
              errorMessageId={errorId("assessment-date")}
              id="assessment-date"
              invalid={Boolean(errors["assessment-date"])}
              onChange={(value) => update({ assessedOn: value })}
              value={form.assessedOn}
            />
            <FieldError id={errorId("assessment-date")}>
              {errors["assessment-date"]}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="assessment-status">Status</FieldLabel>
            <Select
              onValueChange={(value) =>
                update({ status: toAssessmentStatus(value ?? "completed") })
              }
              value={form.status}
            >
              <SelectTrigger className="w-full" id="assessment-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusChoices.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Test results</CardTitle>
        </CardHeader>
        <CardContent>
          <AssessmentResultsEditor
            errors={errors}
            form={form}
            handlers={{
              addCustom: () =>
                update({
                  results: [...form.results, emptyResultDraft()],
                }),
              addPreset: (presetKey) => {
                const draft = presetResultDraft(presetKey);
                if (draft) {
                  update({ results: [...form.results, draft] });
                }
              },
              removeResult: (resultId) =>
                update({
                  results: form.results.filter(
                    (result) => result.id !== resultId
                  ),
                }),
              updateResult: (resultId, patch) =>
                update({
                  results: form.results.map((result) =>
                    result.id === resultId ? { ...result, ...patch } : result
                  ),
                }),
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Coach interpretation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="assessment-summary">Coach summary</FieldLabel>
            <Textarea
              id="assessment-summary"
              onChange={(event) => update({ coachSummary: event.target.value })}
              value={form.coachSummary}
            />
            <FieldError id={errorId("assessment-summary")}>
              {errors["assessment-summary"]}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="assessment-strengths">Strengths</FieldLabel>
            <Textarea
              id="assessment-strengths"
              onChange={(event) =>
                update({ strengthsText: event.target.value })
              }
              placeholder="One per line"
              value={form.strengthsText}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="assessment-development">
              Development areas
            </FieldLabel>
            <Textarea
              id="assessment-development"
              onChange={(event) =>
                update({ developmentText: event.target.value })
              }
              placeholder="One per line"
              value={form.developmentText}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="assessment-recommendations">
              Recommendations
            </FieldLabel>
            <Textarea
              id="assessment-recommendations"
              onChange={(event) =>
                update({ recommendationsText: event.target.value })
              }
              placeholder="One per line"
              value={form.recommendationsText}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="assessment-restrictions">
              Restriction notes
            </FieldLabel>
            <Textarea
              id="assessment-restrictions"
              onChange={(event) =>
                update({ restrictionNotes: event.target.value })
              }
              value={form.restrictionNotes}
            />
          </Field>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button disabled={pending} type="submit">
          <FloppyDiskIcon aria-hidden="true" />
          {pending ? "Saving…" : "Save assessment"}
        </Button>
      </div>
    </form>
  );
};

export const AssessmentFormSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-muted h-10 w-72 animate-pulse rounded-xl" />
    <div className="bg-muted h-64 animate-pulse rounded-xl" />
    <div className="bg-muted h-80 animate-pulse rounded-xl" />
  </div>
);
