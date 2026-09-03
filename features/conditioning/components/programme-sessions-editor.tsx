"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
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

import { WEEKDAY_LABELS } from "../conditioning-calculations";
import {
  intensityLabel,
  sessionIntensities,
  toSessionIntensity,
} from "../conditioning-types";
import type { SessionIntensity } from "../conditioning-types";
import { errorId } from "./conditioning-form-errors";
import type { ConditioningFormErrors } from "./conditioning-form-errors";
import type {
  ProgrammeFormState,
  SessionDraft,
} from "./conditioning-form-state";

export interface SessionHandlers {
  addSession: () => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, patch: Partial<SessionDraft>) => void;
  addExercise: (sessionId: string) => void;
  removeExercise: (sessionId: string, exerciseId: string) => void;
  updateExercise: (
    sessionId: string,
    exerciseId: string,
    patch: Partial<SessionDraft["exercises"][number]>
  ) => void;
}

const intensityOptions = sessionIntensities.map((intensity) => ({
  label: intensityLabel[intensity],
  value: intensity satisfies SessionIntensity,
}));

const weekdayNumberFor = (value: string) => {
  const weekday = Number(value);
  return Number.isInteger(weekday) && weekday >= 0 && weekday <= 6
    ? weekday
    : 1;
};

const ExerciseFields = ({
  errors,
  exercise,
  onRemove,
  update,
}: {
  errors: ConditioningFormErrors;
  exercise: SessionDraft["exercises"][number];
  onRemove: () => void;
  update: (patch: Partial<SessionDraft["exercises"][number]>) => void;
}) => (
  <li className="bg-muted/40 rounded-lg border p-3">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor={`exercise-${exercise.id}-name`}>
          Exercise
        </FieldLabel>
        <Input
          id={`exercise-${exercise.id}-name`}
          onChange={(event) => update({ name: event.target.value })}
          value={exercise.name}
        />
        <FieldError id={errorId(`exercise-${exercise.id}-name`)}>
          {errors[`exercise-${exercise.id}-name`]}
        </FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor={`exercise-${exercise.id}-sets`}>Sets</FieldLabel>
        <Input
          id={`exercise-${exercise.id}-sets`}
          inputMode="numeric"
          onChange={(event) => update({ setTexts: event.target.value })}
          value={exercise.setTexts}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`exercise-${exercise.id}-reps`}>Reps</FieldLabel>
        <Input
          id={`exercise-${exercise.id}-reps`}
          inputMode="numeric"
          onChange={(event) => update({ repsText: event.target.value })}
          value={exercise.repsText}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`exercise-${exercise.id}-duration`}>
          Duration (m:ss)
        </FieldLabel>
        <Input
          id={`exercise-${exercise.id}-duration`}
          onChange={(event) => update({ durationText: event.target.value })}
          placeholder="0:45"
          value={exercise.durationText}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`exercise-${exercise.id}-distance`}>
          Distance (m)
        </FieldLabel>
        <Input
          id={`exercise-${exercise.id}-distance`}
          inputMode="decimal"
          onChange={(event) => update({ distanceText: event.target.value })}
          value={exercise.distanceText}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`exercise-${exercise.id}-load`}>
          Load (kg)
        </FieldLabel>
        <Input
          id={`exercise-${exercise.id}-load`}
          inputMode="decimal"
          onChange={(event) => update({ loadText: event.target.value })}
          value={exercise.loadText}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`exercise-${exercise.id}-rest`}>
          Rest (s)
        </FieldLabel>
        <Input
          id={`exercise-${exercise.id}-rest`}
          inputMode="numeric"
          onChange={(event) => update({ restText: event.target.value })}
          value={exercise.restText}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`exercise-${exercise.id}-rpe`}>
          RPE (1–10)
        </FieldLabel>
        <Input
          id={`exercise-${exercise.id}-rpe`}
          inputMode="decimal"
          onChange={(event) => update({ rpeText: event.target.value })}
          value={exercise.rpeText}
        />
        <FieldError id={errorId(`exercise-${exercise.id}-rpe`)}>
          {errors[`exercise-${exercise.id}-rpe`]}
        </FieldError>
      </Field>
      <Field className="sm:col-span-2 xl:col-span-3">
        <FieldLabel htmlFor={`exercise-${exercise.id}-notes`}>Notes</FieldLabel>
        <Input
          id={`exercise-${exercise.id}-notes`}
          onChange={(event) => update({ notes: event.target.value })}
          value={exercise.notes}
        />
      </Field>
      <div className="flex items-end">
        <Button
          aria-label={`Remove exercise ${exercise.name || ""}`}
          onClick={onRemove}
          size="sm"
          type="button"
          variant="ghost"
        >
          <TrashIcon aria-hidden="true" /> Remove
        </Button>
      </div>
    </div>
  </li>
);

export const ProgrammeSessionsEditor = ({
  errors,
  handlers,
  sessions,
}: {
  errors: ConditioningFormErrors;
  handlers: SessionHandlers;
  sessions: ProgrammeFormState["sessions"];
}) => (
  <div className="space-y-4">
    <FieldError id={errorId("programme-sessions")}>
      {errors["programme-sessions"]}
    </FieldError>
    <ul className="space-y-4">
      {sessions.map((session, index) => (
        <li className="rounded-xl border p-4" key={session.id}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="font-medium">
              {WEEKDAY_LABELS[session.weekday]} ·{" "}
              {session.title || `Session ${index + 1}`}
            </p>
            <Button
              aria-label={`Remove session ${session.title || index + 1}`}
              onClick={() => handlers.removeSession(session.id)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <TrashIcon aria-hidden="true" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={`session-${session.id}-weekday`}>
                Day
              </FieldLabel>
              <Select
                onValueChange={(value) =>
                  handlers.updateSession(session.id, {
                    weekday: weekdayNumberFor(value ?? "1"),
                  })
                }
                value={String(session.weekday)}
              >
                <SelectTrigger
                  className="w-full"
                  id={`session-${session.id}-weekday`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_LABELS.map((label, weekday) => (
                    <SelectItem key={label} value={String(weekday)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`session-${session.id}-start`}>
                Starts
              </FieldLabel>
              <Input
                id={`session-${session.id}-start`}
                onChange={(event) =>
                  handlers.updateSession(session.id, {
                    startsAt: event.target.value,
                  })
                }
                type="time"
                value={session.startsAt}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`session-${session.id}-end`}>
                Ends
              </FieldLabel>
              <Input
                id={`session-${session.id}-end`}
                onChange={(event) =>
                  handlers.updateSession(session.id, {
                    endsAt: event.target.value,
                  })
                }
                type="time"
                value={session.endsAt}
              />
              <FieldError id={errorId(`session-${session.id}-end`)}>
                {errors[`session-${session.id}-end`]}
              </FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor={`session-${session.id}-type`}>
                Type
              </FieldLabel>
              <Input
                id={`session-${session.id}-type`}
                onChange={(event) =>
                  handlers.updateSession(session.id, {
                    type: event.target.value,
                  })
                }
                value={session.type}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`session-${session.id}-title`}>
                Title
              </FieldLabel>
              <Input
                id={`session-${session.id}-title`}
                onChange={(event) =>
                  handlers.updateSession(session.id, {
                    title: event.target.value,
                  })
                }
                value={session.title}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`session-${session.id}-intensity`}>
                Intensity
              </FieldLabel>
              <Select
                onValueChange={(value) =>
                  handlers.updateSession(session.id, {
                    intensity: toSessionIntensity(value ?? "moderate"),
                  })
                }
                value={session.intensity}
              >
                <SelectTrigger
                  className="w-full"
                  id={`session-${session.id}-intensity`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intensityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="sm:col-span-2 xl:col-span-3">
              <FieldLabel htmlFor={`session-${session.id}-notes`}>
                Session notes
              </FieldLabel>
              <Textarea
                id={`session-${session.id}-notes`}
                onChange={(event) =>
                  handlers.updateSession(session.id, {
                    notes: event.target.value,
                  })
                }
                value={session.notes}
              />
            </Field>
          </div>
          <p className="mt-4 mb-2 text-sm font-medium">Exercises</p>
          {session.intensity === "recovery" ||
          /recovery|rest/i.test(session.type) ? (
            <p className="text-muted-foreground text-sm">
              Recovery sessions cannot contain exercise prescriptions.
            </p>
          ) : (
            <>
              <FieldError id={errorId(`session-${session.id}-exercises`)}>
                {errors[`session-${session.id}-exercises`]}
              </FieldError>
              <ul className="space-y-3">
                {session.exercises.map((exercise) => (
                  <ExerciseFields
                    errors={errors}
                    exercise={exercise}
                    key={exercise.id}
                    onRemove={() =>
                      handlers.removeExercise(session.id, exercise.id)
                    }
                    update={(patch) =>
                      handlers.updateExercise(session.id, exercise.id, patch)
                    }
                  />
                ))}
              </ul>
              <Button
                onClick={() => handlers.addExercise(session.id)}
                size="sm"
                type="button"
                variant="outline"
                className="mt-2"
              >
                <PlusIcon aria-hidden="true" /> Add exercise
              </Button>
            </>
          )}
        </li>
      ))}
    </ul>
    <Button
      onClick={() => handlers.addSession()}
      type="button"
      variant="outline"
    >
      <PlusIcon aria-hidden="true" /> Add session
    </Button>
  </div>
);
