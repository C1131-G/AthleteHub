"use client";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { Assessment, AssessmentType } from "../assessment-types";

const valueFor = (
  values: Record<string, number | string | undefined>,
  name: string
) => values[name];

const mentisValue = (
  record: Extract<Assessment, { assessmentType: "mentis" }>,
  name: string
) => {
  const values = {
    bowCant: record.bowCant,
    holdDurationSeconds: record.holdDurationSeconds,
    holdStability: record.holdStability,
    setupStability: record.setupStability,
  };
  return valueFor(values, name);
};

const dartfishValue = (
  record: Extract<Assessment, { assessmentType: "dartfish" }>,
  name: string
) => {
  const values = {
    elbowAngleDegrees: record.elbowAngleDegrees,
    technicalNotes: record.technicalNotes,
  };
  return valueFor(values, name);
};

const ringShotValue = (
  record: Extract<Assessment, { assessmentType: "ring-shot" }>,
  name: string
) => {
  if (name === "strengths") {
    return record.strengths.join("\n");
  }
  if (name === "actionItems") {
    return record.actionItems.join("\n");
  }
};

const psychologyValue = (
  record: Extract<Assessment, { assessmentType: "psychology" }>,
  name: string
) => {
  const values = {
    baselineAlpha: record.baselineAlpha,
    baselineBeta: record.baselineBeta,
    baselineGamma: record.baselineGamma,
    baselineSymmetry: record.baselineSymmetry,
    concerns: record.concerns.join("\n"),
    interpretation: record.interpretation,
    recommendations: record.recommendations.join("\n"),
    strengths: record.strengths.join("\n"),
    visualizationAlpha: record.visualizationAlpha,
    visualizationBeta: record.visualizationBeta,
    visualizationGamma: record.visualizationGamma,
    visualizationSymmetry: record.visualizationSymmetry,
  };
  return valueFor(values, name);
};

const fieldValue = (record: Assessment | undefined, name: string) => {
  if (!record) {
    return;
  }
  if (record.assessmentType === "mentis") {
    return mentisValue(record, name);
  }
  if (record.assessmentType === "dartfish") {
    return dartfishValue(record, name);
  }
  if (record.assessmentType === "ring-shot") {
    return ringShotValue(record, name);
  }
  return psychologyValue(record, name);
};

export const AssessmentFields = ({
  type,
  date,
  setDate,
  errors,
  record,
}: {
  type: AssessmentType;
  date: string;
  setDate: (value: string) => void;
  errors: Record<string, string>;
  record?: Assessment | undefined;
}) => {
  const input = (
    name: string,
    label: string,
    options: { type?: string; step?: string } = {}
  ) => (
    <Field>
      <FieldLabel htmlFor={`assessment-${name}`}>{label}</FieldLabel>
      <Input
        defaultValue={String(fieldValue(record, name) ?? "")}
        id={`assessment-${name}`}
        name={name}
        {...options}
        aria-invalid={errors[name] ? true : undefined}
        aria-errormessage={errors[name] ? `error-${name}` : undefined}
      />
      {errors[name] ? (
        <FieldError id={`error-${name}`}>{errors[name]}</FieldError>
      ) : null}
    </Field>
  );
  const area = (name: string, label: string) => (
    <Field>
      <FieldLabel htmlFor={`assessment-${name}`}>{label}</FieldLabel>
      <Textarea
        defaultValue={String(fieldValue(record, name) ?? "")}
        id={`assessment-${name}`}
        name={name}
        aria-invalid={errors[name] ? true : undefined}
        aria-errormessage={errors[name] ? `error-${name}` : undefined}
      />
      {errors[name] ? (
        <FieldError id={`error-${name}`}>{errors[name]}</FieldError>
      ) : null}
    </Field>
  );
  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor="assessment-date">Assessment date</FieldLabel>
        <DatePicker
          id="assessment-date"
          value={date}
          onChange={setDate}
          invalid={Boolean(errors.assessedOn)}
          errorMessageId="error-assessedOn"
        />
        {errors.assessedOn ? (
          <FieldError id="error-assessedOn">{errors.assessedOn}</FieldError>
        ) : null}
      </Field>
      {type === "mentis" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {input("setupStability", "Setup stability (0–10)", {
            step: "0.1",
            type: "number",
          })}
          {input("holdStability", "Hold stability (0–10)", {
            step: "0.1",
            type: "number",
          })}
          {input("holdDurationSeconds", "Hold duration (seconds)", {
            step: "0.1",
            type: "number",
          })}
          {input("bowCant", "Bow cant (degrees)", {
            step: "0.1",
            type: "number",
          })}
        </div>
      ) : null}
      {type === "dartfish" ? (
        <div className="space-y-4">
          {input("elbowAngleDegrees", "Elbow angle (degrees)", {
            step: "0.1",
            type: "number",
          })}
          {area("technicalNotes", "Technical notes")}
        </div>
      ) : null}
      {type === "ring-shot" ? (
        <div className="space-y-4">
          {area("strengths", "Strengths (one per line)")}
          {area("actionItems", "Action items (one per line)")}
        </div>
      ) : null}
      {type === "psychology" ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "baselineAlpha",
              "baselineBeta",
              "baselineGamma",
              "baselineSymmetry",
              "visualizationAlpha",
              "visualizationBeta",
              "visualizationGamma",
              "visualizationSymmetry",
            ].map((name) =>
              input(
                name,
                name.replaceAll(/(?<capital>[A-Z])/g, " $<capital>"),
                {
                  step: "0.1",
                  type: "number",
                }
              )
            )}
          </div>
          {area("interpretation", "Interpretation")}
          {area("strengths", "Strengths (one per line)")}
          {area("concerns", "Concerns (one per line)")}
          {area("recommendations", "Recommendations (one per line)")}
        </div>
      ) : null}
    </div>
  );
};
