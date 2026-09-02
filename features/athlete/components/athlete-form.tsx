"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
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
  FieldGroup,
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

import type {
  Athlete,
  AthleteInput,
  AthleteStatus,
  BowCategory,
} from "../athlete-types";
import { useAthletes } from "./athlete-provider";

type FormValues = AthleteInput;
type FormErrors = Partial<Record<keyof FormValues | "form", string>>;

const emptyValues: FormValues = {
  armSpanCm: undefined,
  athleteId: "",
  category: "recurve",
  dateOfBirth: "",
  equipmentNotes: "",
  fullName: "",
  heightCm: undefined,
  photoUrl: "",
  status: "active",
  targetDistanceM: undefined,
  targetScore: undefined,
  technicalFocus: "",
  weightKg: undefined,
};

const numberValue = (value: string) =>
  value === "" ? undefined : Number(value);

const isBowCategory = (value: string | null): value is BowCategory =>
  value === "recurve" || value === "compound" || value === "barebow";

const isAthleteStatus = (value: string | null): value is AthleteStatus =>
  value === "active" || value === "medical-leave" || value === "inactive";

const categoryLabel = {
  barebow: "Barebow",
  compound: "Compound",
  recurve: "Recurve",
} satisfies Record<BowCategory, string>;

const statusLabel = {
  active: "Active",
  inactive: "Inactive",
  "medical-leave": "Medical leave",
} satisfies Record<AthleteStatus, string>;

export const AthleteForm = ({ athlete }: { athlete?: Athlete }) => {
  const router = useRouter();
  const { athletes, createAthlete, updateAthlete } = useAthletes();
  const [values, setValues] = useState<FormValues>(
    athlete ? { ...athlete } : emptyValues
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  const validate = () => {
    const next: FormErrors = {};
    if (!values.athleteId.trim()) {
      next.athleteId = "Enter an athlete ID.";
    }
    if (!values.fullName.trim()) {
      next.fullName = "Enter the athlete's full name.";
    }
    if (!values.dateOfBirth) {
      next.dateOfBirth = "Enter the date of birth.";
    }
    if (
      values.dateOfBirth &&
      values.dateOfBirth > new Date().toISOString().slice(0, 10)
    ) {
      next.dateOfBirth = "Date of birth cannot be in the future.";
    }
    if (
      athletes.some(
        (item) =>
          item.athleteId.toLowerCase() ===
            values.athleteId.trim().toLowerCase() && item.id !== athlete?.id
      )
    ) {
      next.athleteId = "That athlete ID is already in use.";
    }
    for (const [key, label] of [
      ["heightCm", "Height"],
      ["weightKg", "Weight"],
      ["armSpanCm", "Arm span"],
      ["targetDistanceM", "Target distance"],
      ["targetScore", "Target score"],
    ] as const) {
      if (
        values[key] !== undefined &&
        (!Number.isFinite(values[key]) || values[key] <= 0)
      ) {
        next[key] = `${label} must be greater than zero.`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    const saved = athlete
      ? updateAthlete(athlete.id, values)
      : createAthlete(values);
    if (saved) {
      router.push(`/athletes/${saved.id}`);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      noValidate
      className="space-y-6"
      data-testid={athlete ? undefined : "new-athlete-shell-marker"}
    >
      {errors.form && <FieldError>{errors.form}</FieldError>}
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>
            Basic information used throughout AthleteHub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="athleteId">Athlete ID</FieldLabel>
                <Input
                  id="athleteId"
                  value={values.athleteId}
                  onChange={(event) => update("athleteId", event.target.value)}
                  aria-invalid={Boolean(errors.athleteId)}
                  aria-describedby={
                    errors.athleteId ? "athleteId-error" : undefined
                  }
                />
                {errors.athleteId && (
                  <FieldError id="athleteId-error">
                    {errors.athleteId}
                  </FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                <Input
                  id="fullName"
                  value={values.fullName}
                  onChange={(event) => update("fullName", event.target.value)}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={
                    errors.fullName ? "fullName-error" : undefined
                  }
                />
                {errors.fullName && (
                  <FieldError id="fullName-error">{errors.fullName}</FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="dateOfBirth">Date of birth</FieldLabel>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={values.dateOfBirth}
                  onChange={(event) =>
                    update("dateOfBirth", event.target.value)
                  }
                  aria-invalid={Boolean(errors.dateOfBirth)}
                  aria-describedby={
                    errors.dateOfBirth ? "dateOfBirth-error" : undefined
                  }
                />
                {errors.dateOfBirth && (
                  <FieldError id="dateOfBirth-error">
                    {errors.dateOfBirth}
                  </FieldError>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="photoUrl">
                  Photo URL{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  id="photoUrl"
                  type="url"
                  value={values.photoUrl ?? ""}
                  onChange={(event) => update("photoUrl", event.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
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
      <div className="flex justify-end gap-3">
        <Link
          className={buttonVariants({ variant: "outline" })}
          href={athlete ? `/athletes/${athlete.id}` : "/athletes"}
        >
          Cancel
        </Link>
        <Button type="submit">
          {athlete ? "Save changes" : "Create athlete"}
        </Button>
      </div>
    </form>
  );
};

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
