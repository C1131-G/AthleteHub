"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { categoryLabel, statusLabel } from "../athlete-labels";
import type {
  AthleteInput,
  AthleteStatus,
  BowCategory,
} from "../athlete-types";

type FormValues = AthleteInput;
type FormErrors = Partial<Record<keyof FormValues | "form", string>>;

const numberValue = (value: string) =>
  value === "" ? undefined : Number(value);

const isBowCategory = (value: string | null): value is BowCategory =>
  value === "recurve" || value === "compound" || value === "barebow";

const isAthleteStatus = (value: string | null): value is AthleteStatus =>
  value === "active" || value === "medical-leave" || value === "inactive";

/** The archery and measurement sections of the athlete form. */
export const AthleteDetailFields = ({
  errors,
  update,
  values,
}: {
  errors: FormErrors;
  update: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
  values: FormValues;
}) => (
  <>
    <Card>
      <CardHeader>
        <CardTitle>Archery details</CardTitle>
        <CardDescription>
          Set the athlete's bow category, availability, and current target.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <Field>
            <FieldLabel>Bow category</FieldLabel>
            <Select
              value={values.category}
              onValueChange={(value) =>
                update("category", isBowCategory(value) ? value : "recurve")
              }
            >
              <SelectTrigger>
                <SelectValue>{categoryLabel[values.category]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recurve">Recurve</SelectItem>
                <SelectItem value="compound">Compound</SelectItem>
                <SelectItem value="barebow">Barebow</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select
              value={values.status}
              onValueChange={(value) =>
                update("status", isAthleteStatus(value) ? value : "active")
              }
            >
              <SelectTrigger>
                <SelectValue>{statusLabel[values.status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="medical-leave">Medical leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="targetDistanceM">
              Target distance (m)
            </FieldLabel>
            <Input
              id="targetDistanceM"
              type="number"
              min="1"
              value={values.targetDistanceM ?? ""}
              onChange={(event) =>
                update("targetDistanceM", numberValue(event.target.value))
              }
              aria-invalid={Boolean(errors.targetDistanceM)}
              aria-describedby={
                errors.targetDistanceM ? "targetDistanceM-error" : undefined
              }
            />
            {errors.targetDistanceM && (
              <FieldError id="targetDistanceM-error">
                {errors.targetDistanceM}
              </FieldError>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="targetScore">Target score</FieldLabel>
            <Input
              id="targetScore"
              type="number"
              min="1"
              value={values.targetScore ?? ""}
              onChange={(event) =>
                update("targetScore", numberValue(event.target.value))
              }
              aria-invalid={Boolean(errors.targetScore)}
              aria-describedby={
                errors.targetScore ? "targetScore-error" : undefined
              }
            />
            {errors.targetScore && (
              <FieldError id="targetScore-error">
                {errors.targetScore}
              </FieldError>
            )}
          </Field>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>Measurements and equipment</CardTitle>
        <CardDescription>
          Optional measurements help track the athlete's setup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          <NumberField
            id="heightCm"
            label="Height (cm)"
            value={values.heightCm}
            error={errors.heightCm}
            onChange={(value) => update("heightCm", value)}
          />
          <NumberField
            id="weightKg"
            label="Weight (kg)"
            value={values.weightKg}
            error={errors.weightKg}
            onChange={(value) => update("weightKg", value)}
          />
          <NumberField
            id="armSpanCm"
            label="Arm span (cm)"
            value={values.armSpanCm}
            error={errors.armSpanCm}
            onChange={(value) => update("armSpanCm", value)}
          />
        </div>
        <Field className="mt-6">
          <FieldLabel htmlFor="equipmentNotes">Equipment notes</FieldLabel>
          <Textarea
            id="equipmentNotes"
            value={values.equipmentNotes}
            onChange={(event) => update("equipmentNotes", event.target.value)}
            placeholder="Bow setup, draw weight, arrows, or other notes"
          />
        </Field>
        <Field className="mt-6">
          <FieldLabel htmlFor="technicalFocus">Technical focus</FieldLabel>
          <Textarea
            id="technicalFocus"
            value={values.technicalFocus}
            onChange={(event) => update("technicalFocus", event.target.value)}
            placeholder="Current training focus"
          />
          <FieldDescription>
            Keep this short enough to scan on the profile page.
          </FieldDescription>
        </Field>
      </CardContent>
    </Card>
  </>
);

const NumberField = ({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value?: number;
  error?: string;
  onChange: (value?: number) => void;
}) => {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        min="1"
        value={value ?? ""}
        onChange={(event) => onChange(numberValue(event.target.value))}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
};
