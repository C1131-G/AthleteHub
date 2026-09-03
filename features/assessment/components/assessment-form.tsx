"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAthletes } from "@/features/athlete/use-athletes";

import { assessmentHref, safeReturnHref } from "../assessment-routes";
import { createAssessment, updateAssessment } from "../assessment-store";
import {
  assessmentInputSchema,
  assessmentTypeLabel,
  assessmentTypeSchema,
  assessmentTypes,
} from "../assessment-types";
import type {
  Assessment,
  AssessmentInput,
  AssessmentType,
} from "../assessment-types";
import { AssessmentFields } from "./assessment-fields";

const localToday = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};
const number = (form: FormData, name: string) => {
  const value = String(form.get(name) ?? "").trim();
  return value ? Number(value) : undefined;
};
const lines = (form: FormData, name: string) =>
  String(form.get(name) ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
const buildInput = (
  form: FormData,
  type: AssessmentType,
  date: string
): AssessmentInput => {
  const base = {
    assessedOn: date,
    assessmentType: type,
    athleteId: String(form.get("athleteId") ?? ""),
    weeklyReportId: String(form.get("weeklyReportId") ?? "") || undefined,
  };
  if (type === "mentis") {
    return {
      ...base,
      assessmentType: type,
      bowCant: number(form, "bowCant"),
      holdDurationSeconds: number(form, "holdDurationSeconds"),
      holdStability: number(form, "holdStability"),
      setupStability: number(form, "setupStability"),
    };
  }
  if (type === "dartfish") {
    return {
      ...base,
      assessmentType: type,
      elbowAngleDegrees: number(form, "elbowAngleDegrees"),
      technicalNotes: String(form.get("technicalNotes") ?? ""),
    };
  }
  if (type === "ring-shot") {
    return {
      ...base,
      actionItems: lines(form, "actionItems"),
      assessmentType: type,
      strengths: lines(form, "strengths"),
    };
  }
  return {
    ...base,
    assessmentType: type,
    baselineAlpha: number(form, "baselineAlpha"),
    baselineBeta: number(form, "baselineBeta"),
    baselineGamma: number(form, "baselineGamma"),
    baselineSymmetry: number(form, "baselineSymmetry"),
    concerns: lines(form, "concerns"),
    interpretation: String(form.get("interpretation") ?? ""),
    recommendations: lines(form, "recommendations"),
    strengths: lines(form, "strengths"),
    visualizationAlpha: number(form, "visualizationAlpha"),
    visualizationBeta: number(form, "visualizationBeta"),
    visualizationGamma: number(form, "visualizationGamma"),
    visualizationSymmetry: number(form, "visualizationSymmetry"),
  };
};
// oxlint-disable-next-line complexity -- this controller coordinates the four typed assessment variants.
export const AssessmentForm = ({
  record,
  initialAthleteId,
  initialDate,
  returnTo,
}: {
  record?: Assessment | undefined;
  initialAthleteId?: string | undefined;
  initialDate?: string | undefined;
  returnTo?: string | undefined;
}) => {
  const router = useRouter();
  const { athletes, ready } = useAthletes();
  const [type, setType] = useState<AssessmentType>(
    record?.assessmentType ?? "mentis"
  );
  const [date, setDate] = useState(record?.assessedOn ?? initialDate ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dateValue = date || (ready ? localToday() : "");
  if (!ready) {
    return <AssessmentFormSkeleton />;
  }
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    const input = buildInput(
      new FormData(event.currentTarget),
      type,
      dateValue
    );
    const parsed = assessmentInputSchema.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.map(String).join(".") || "form";
        if (!next[key]) {
          next[key] = issue.message;
        }
      }
      setErrors(next);
      const [first] = Object.keys(next);
      let targetId = `assessment-${first ?? "athlete"}`;
      if (first === "athleteId") {
        targetId = "assessment-athlete";
      } else if (first === "assessmentType") {
        targetId = "assessment-type";
      } else if (first === "assessedOn") {
        targetId = "assessment-date";
      }
      document.querySelector<HTMLElement>(`#${targetId}`)?.focus();
      return;
    }
    const result = record
      ? updateAssessment(record.id, parsed.data)
      : createAssessment(parsed.data);
    if (result.status !== "saved") {
      setErrors(result.fieldErrors);
      return;
    }
    const destination =
      safeReturnHref(returnTo) ?? assessmentHref(result.assessment.id);
    // SAFETY: safeReturnHref only returns same-origin internal route shapes.
    router.push(destination as Parameters<typeof router.push>[0], {
      transitionTypes: ["nav-forward"],
    });
  };
  return (
    <form className="space-y-6" noValidate onSubmit={submit}>
      {Object.keys(errors).length > 0 ? (
        <div
          aria-live="assertive"
          className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
          id="assessment-form-errors"
          role="alert"
        >
          {errors.form ?? "Review the highlighted fields and try again."}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>
            {record ? "Edit assessment" : "Record assessment"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="assessment-athlete">Athlete</FieldLabel>
            <Select
              name="athleteId"
              defaultValue={record?.athleteId ?? initialAthleteId}
              disabled={Boolean(record)}
            >
              <SelectTrigger
                aria-errormessage={
                  errors.athleteId ? "error-athleteId" : undefined
                }
                aria-invalid={Boolean(errors.athleteId)}
                id="assessment-athlete"
              >
                <SelectValue placeholder="Select athlete" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.fullName} · {athlete.athleteId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.athleteId ? (
              <FieldError id="error-athleteId">{errors.athleteId}</FieldError>
            ) : null}
          </Field>
          {record ? (
            <input
              name="athleteId"
              type="hidden"
              value={record.athleteId}
              readOnly
            />
          ) : null}
          <Field>
            <FieldLabel htmlFor="assessment-type">Assessment type</FieldLabel>
            <Select
              value={type}
              onValueChange={(value) => {
                const parsedType = assessmentTypeSchema.safeParse(value);
                if (parsedType.success) {
                  setType(parsedType.data);
                }
              }}
              disabled={Boolean(record)}
            >
              <SelectTrigger
                aria-errormessage={
                  errors.assessmentType ? "error-assessmentType" : undefined
                }
                aria-invalid={Boolean(errors.assessmentType)}
                id="assessment-type"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assessmentTypes.map((item) => (
                  <SelectItem key={item} value={item}>
                    {assessmentTypeLabel[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.assessmentType ? (
              <FieldError id="error-assessmentType">
                {errors.assessmentType}
              </FieldError>
            ) : null}
          </Field>
          <input
            name="weeklyReportId"
            type="hidden"
            value={record?.weeklyReportId ?? ""}
            readOnly
          />
          <AssessmentFields
            date={dateValue}
            errors={errors}
            record={record}
            setDate={setDate}
            type={type}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit">
              {record ? "Save changes" : "Save assessment"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};
export const AssessmentFormSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-muted h-12 w-80 animate-pulse rounded-xl" />
    <div className="bg-muted h-96 animate-pulse rounded-xl" />
  </div>
);
