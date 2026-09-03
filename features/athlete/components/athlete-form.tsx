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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import type { Athlete, AthleteInput } from "../athlete-types";
import { useAthletes } from "../use-athletes";
import { AthleteDetailFields } from "./athlete-detail-fields";

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

/** A date of birth cannot be in the future. */
const today = new Date();
const noFutureDates = { after: today };

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
                <DatePicker
                  clearable
                  describedBy={
                    errors.dateOfBirth ? "dateOfBirth-error" : undefined
                  }
                  disabled={noFutureDates}
                  endMonth={today}
                  errorMessageId="dateOfBirth-error"
                  id="dateOfBirth"
                  invalid={Boolean(errors.dateOfBirth)}
                  onChange={(value) => update("dateOfBirth", value)}
                  placeholder="Select date of birth"
                  value={values.dateOfBirth}
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
      <AthleteDetailFields errors={errors} update={update} values={values} />
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
