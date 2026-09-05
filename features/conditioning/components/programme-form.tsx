"use client";

import { FloppyDiskIcon, SparkleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { useTrainingPlans } from "@/features/training-plan/use-training-plans";

import { parseDuration } from "../conditioning-calculations";
import { conditioningHref } from "../conditioning-routes";
import {
  phaseLabel,
  toConditioningPhase,
  toProgrammeStatus,
} from "../conditioning-types";
import { useConditioning } from "../use-conditioning";
import { errorId, focusFirstError } from "./conditioning-form-errors";
import type { ConditioningFormErrors } from "./conditioning-form-errors";
import {
  createProgrammeDraft,
  toProgrammeInput,
} from "./conditioning-form-state";
import type {
  ProgrammeFormState,
  SessionDraft,
} from "./conditioning-form-state";
import type { SessionHandlers } from "./programme-sessions-editor";
import { ProgrammeSessionsEditor } from "./programme-sessions-editor";

const phaseOptions = Object.entries(phaseLabel).map(([value, label]) => ({
  label,
  value,
}));

const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
] as const;

const positiveOrUndefined = (text: string) => {
  if (!text.trim()) {
    return;
  }
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
};

const validateExercise = (
  exercise: ProgrammeFormState["sessions"][number]["exercises"][number],
  errors: ConditioningFormErrors
) => {
  if (!exercise.name.trim()) {
    return;
  }
  const numericFields = [
    ["sets", exercise.setTexts],
    ["reps", exercise.repsText],
    ["distance", exercise.distanceText],
    ["load", exercise.loadText],
    ["rest", exercise.restText],
  ] as const;
  for (const [field, text] of numericFields) {
    if (Number.isNaN(positiveOrUndefined(text))) {
      errors[`exercise-${exercise.id}-${field}`] =
        "Enter a non-negative number.";
    }
  }
  if (
    exercise.durationText.trim() &&
    parseDuration(exercise.durationText) === undefined
  ) {
    errors[`exercise-${exercise.id}-duration`] = "Use m:ss or seconds.";
  }
  const rpe = Number(exercise.rpeText);
  if (
    exercise.rpeText.trim() &&
    (!Number.isFinite(rpe) || rpe < 1 || rpe > 10)
  ) {
    errors[`exercise-${exercise.id}-rpe`] = "RPE must be between 1 and 10.";
  }
};

const validateSession = (
  session: ProgrammeFormState["sessions"][number],
  errors: ConditioningFormErrors
) => {
  if (session.endsAt <= session.startsAt) {
    errors[`session-${session.id}-end`] =
      "The session end time must be after the start time.";
  }
  const isRecovery =
    session.intensity === "recovery" || /recovery|rest/i.test(session.type);
  if (
    isRecovery &&
    session.exercises.some((exercise) => exercise.name.trim())
  ) {
    errors[`session-${session.id}-exercises`] =
      "Recovery sessions cannot contain exercise prescriptions.";
  }
  for (const exercise of session.exercises) {
    validateExercise(exercise, errors);
  }
};

const validateProgramme = (
  form: ProgrammeFormState,
  overlappingActive: boolean
): ConditioningFormErrors => {
  const errors: ConditioningFormErrors = {};
  if (!form.athleteId) {
    errors["programme-athlete"] = "Select an athlete.";
  }
  if (!form.title.trim()) {
    errors["programme-title"] = "Give the programme a title.";
  }
  if (!form.startsOn) {
    errors["programme-start"] = "Choose a start date.";
  }
  if (!form.endsOn) {
    errors["programme-end"] = "Choose an end date.";
  }
  if (form.startsOn && form.endsOn && form.endsOn < form.startsOn) {
    errors["programme-end"] = "The end date cannot be before the start date.";
  }
  if (overlappingActive) {
    errors["programme-start"] =
      "An active programme already covers part of this date range.";
  }
  if (form.phase === "custom" && !form.customPhase.trim()) {
    errors["programme-phase"] = "Name the custom phase.";
  }
  if (form.sessions.length === 0) {
    errors["programme-sessions"] = "Add at least one weekly session.";
  }
  for (const session of form.sessions) {
    validateSession(session, errors);
  }
  return errors;
};

export const ProgrammeForm = ({
  programmeId,
}: {
  programmeId?: string | undefined;
}) => {
  const { ready: athletesReady } = useAthletes();
  const { ready: conditioningReady } = useConditioning();
  const { ready: plansReady } = useTrainingPlans();
  if (!(athletesReady && conditioningReady && plansReady)) {
    return <ProgrammeFormSkeleton />;
  }
  return <ProgrammeFormBody programmeId={programmeId} />;
};

const ProgrammeFormBody = ({
  programmeId,
}: {
  programmeId?: string | undefined;
}) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { athletes } = useAthletes();
  const { createProgramme, getProgramme, programmes, updateProgramme } =
    useConditioning();
  const existing = programmeId ? getProgramme(programmeId) : undefined;
  const [form, setForm] = useState<ProgrammeFormState>(() =>
    createProgrammeDraft(existing?.athleteId ?? athletes[0]?.id ?? "", existing)
  );
  const [errors, setErrors] = useState<ConditioningFormErrors>({});

  if (programmeId && !existing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Programme not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} href={conditioningHref()}>
            Back to conditioning
          </Link>
        </CardContent>
      </Card>
    );
  }

  const update = (patch: Partial<ProgrammeFormState>) =>
    setForm((current) => ({ ...current, ...patch }));
  const overlappingActive = programmes.some(
    (programme) =>
      programme.id !== programmeId &&
      programme.athleteId === form.athleteId &&
      programme.status === "active" &&
      form.startsOn <= programme.endsOn &&
      form.endsOn >= programme.startsOn
  );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateProgramme(form, overlappingActive);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }
    const input = toProgrammeInput(form);
    startTransition(async () => {
      const result = programmeId
        ? await updateProgramme(programmeId, input)
        : await createProgramme(input);
      if (result.status === "saved") {
        router.push(`/conditioning/programmes/${result.record.id}`);
      } else {
        setErrors(result.fieldErrors);
        focusFirstError(result.fieldErrors);
      }
    });
  };

  const sessionHandlers: SessionHandlers = {
    addExercise: (sessionId) =>
      update({
        sessions: form.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                exercises: [
                  ...session.exercises,
                  {
                    distanceText: "",
                    durationText: "",
                    id: crypto.randomUUID(),
                    loadText: "",
                    name: "",
                    notes: "",
                    repsText: "",
                    restText: "",
                    rpeText: "",
                    setTexts: "",
                  },
                ],
              }
            : session
        ),
      }),
    addSession: () =>
      update({
        sessions: [
          ...form.sessions,
          {
            endsAt: "",
            exercises: [],
            id: crypto.randomUUID(),
            intensity: "moderate",
            notes: "",
            startsAt: "",
            title: "",
            type: "",
            weekday: 1,
          } satisfies SessionDraft,
        ],
      }),
    removeExercise: (sessionId, exerciseId) =>
      update({
        sessions: form.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                exercises: session.exercises.filter(
                  (exercise) => exercise.id !== exerciseId
                ),
              }
            : session
        ),
      }),
    removeSession: (sessionId) =>
      update({
        sessions: form.sessions.filter((session) => session.id !== sessionId),
      }),
    updateExercise: (sessionId, exerciseId, patch) =>
      update({
        sessions: form.sessions.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                exercises: session.exercises.map((exercise) =>
                  exercise.id === exerciseId
                    ? { ...exercise, ...patch }
                    : exercise
                ),
              }
            : session
        ),
      }),
    updateSession: (sessionId, patch) =>
      update({
        sessions: form.sessions.map((session) =>
          session.id === sessionId ? { ...session, ...patch } : session
        ),
      }),
  };

  return (
    <form className="space-y-6" noValidate onSubmit={submit}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">
            {programmeId ? "Edit programme" : "New programme"}
          </h1>
          <p className="text-muted-foreground mt-2">
            A dated weekly training block with sessions, intensity, and
            restrictions.
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
          <p className="font-medium">Check the programme before saving.</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Programme details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="programme-athlete">Athlete</FieldLabel>
            <AthletePicker
              id="programme-athlete"
              value={form.athleteId}
              onChange={(value) => update({ athleteId: value })}
            />
            <FieldError id={errorId("programme-athlete")}>
              {errors["programme-athlete"]}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="programme-title">Title</FieldLabel>
            <Input
              id="programme-title"
              onChange={(event) => update({ title: event.target.value })}
              value={form.title}
            />
            <FieldError id={errorId("programme-title")}>
              {errors["programme-title"]}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="programme-start">Starts on</FieldLabel>
            <DatePicker
              errorMessageId={errorId("programme-start")}
              id="programme-start"
              invalid={Boolean(errors["programme-start"])}
              onChange={(value) => update({ startsOn: value })}
              value={form.startsOn}
            />
            <FieldError id={errorId("programme-start")}>
              {errors["programme-start"]}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="programme-end">Ends on</FieldLabel>
            <DatePicker
              errorMessageId={errorId("programme-end")}
              id="programme-end"
              invalid={Boolean(errors["programme-end"])}
              onChange={(value) => update({ endsOn: value })}
              value={form.endsOn}
            />
            <FieldError id={errorId("programme-end")}>
              {errors["programme-end"]}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="programme-status">Status</FieldLabel>
            <Select
              onValueChange={(value) =>
                update({
                  status: toProgrammeStatus(value ?? "draft"),
                })
              }
              value={form.status}
            >
              <SelectTrigger className="w-full" id="programme-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="programme-phase">Phase</FieldLabel>
            <Select
              onValueChange={(value) =>
                update({ phase: toConditioningPhase(value ?? "foundation") })
              }
              value={form.phase}
            >
              <SelectTrigger className="w-full" id="programme-phase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {phaseOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id={errorId("programme-phase")}>
              {errors["programme-phase"]}
            </FieldError>
          </Field>
          {form.phase === "custom" ? (
            <Field>
              <FieldLabel htmlFor="programme-custom-phase">
                Custom phase name
              </FieldLabel>
              <Input
                id="programme-custom-phase"
                onChange={(event) =>
                  update({ customPhase: event.target.value })
                }
                value={form.customPhase}
              />
              <FieldError id={errorId("programme-custom-phase")}>
                {errors["programme-phase"]}
              </FieldError>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor="programme-plan">
              Linked training plan
            </FieldLabel>
            <TrainingPlanSelect
              athleteId={form.athleteId}
              onChange={(value) => update({ trainingPlanId: value })}
              value={form.trainingPlanId}
            />
          </Field>
          <Field className="sm:col-span-2 xl:col-span-3">
            <FieldLabel htmlFor="programme-objectives">Objectives</FieldLabel>
            <Textarea
              id="programme-objectives"
              onChange={(event) =>
                update({ objectivesText: event.target.value })
              }
              placeholder="One per line"
              value={form.objectivesText}
            />
          </Field>
          <Field className="sm:col-span-2 xl:col-span-3">
            <FieldLabel htmlFor="programme-restrictions">
              Restriction notes (injuries, illness, return-to-training limits)
            </FieldLabel>
            <Textarea
              id="programme-restrictions"
              onChange={(event) =>
                update({ restrictionNotes: event.target.value })
              }
              value={form.restrictionNotes}
            />
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Weekly schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {existing ? null : (
            <Button
              onClick={() => update(createProgrammeDraft(form.athleteId))}
              type="button"
              variant="outline"
              className="mb-4"
            >
              <SparkleIcon aria-hidden="true" /> Load recommended weekly
              structure
            </Button>
          )}
          <ProgrammeSessionsEditor
            errors={errors}
            handlers={sessionHandlers}
            sessions={form.sessions}
          />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button disabled={pending} type="submit">
          <FloppyDiskIcon aria-hidden="true" />
          {pending ? "Saving…" : "Save programme"}
        </Button>
      </div>
    </form>
  );
};

const TrainingPlanSelect = ({
  athleteId,
  onChange,
  value,
}: {
  athleteId: string;
  onChange: (value: string) => void;
  value: string;
}) => {
  const { plans } = useTrainingPlans();
  const athletePlans = plans.filter((plan) => plan.athleteId === athleteId);
  return (
    <Select
      onValueChange={(selected) => onChange(selected ?? "")}
      value={value || "none"}
    >
      <SelectTrigger className="w-full" id="programme-plan">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Not linked</SelectItem>
        {athletePlans.map((plan) => (
          <SelectItem key={plan.id} value={plan.id}>
            {plan.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const ProgrammeFormSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-muted h-10 w-72 animate-pulse rounded-xl" />
    <div className="bg-muted h-64 animate-pulse rounded-xl" />
    <div className="bg-muted h-96 animate-pulse rounded-xl" />
  </div>
);
