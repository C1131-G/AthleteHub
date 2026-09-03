"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { errorId, fieldProps } from "./training-plan-form-errors";
import type { PlanFormErrors } from "./training-plan-form-errors";
import { blankWeek, nextWeekStart } from "./training-plan-form-state";
import type {
  PlanWeekFormState,
  TrainingPlanFormState,
  UpdatePlanField,
} from "./training-plan-form-state";

interface WeekFieldsProps {
  errors: PlanFormErrors;
  form: TrainingPlanFormState;
  update: UpdatePlanField;
}

const perTrainingDay = (week: PlanWeekFormState) => {
  if (!(week.arrowsPlanned.trim() && week.trainingDaysPlanned.trim())) {
    return "Set a target to see the daily load.";
  }
  const arrows = Number(week.arrowsPlanned);
  const days = Number(week.trainingDaysPlanned);
  if (!(Number.isFinite(arrows) && Number.isFinite(days)) || days <= 0) {
    return "Set a target to see the daily load.";
  }
  return `${Math.round(arrows / days)} per training day`;
};

export const TrainingPlanWeekFields = ({
  errors,
  form,
  update,
}: WeekFieldsProps) => {
  const appendWeeks = (count: number) => {
    const added: PlanWeekFormState[] = [];
    let cursor =
      form.weeks.at(-1)?.weekStart ||
      // The first row seeds from the season start so dates stay inside range.
      nextWeekStart(form.startsOn) ||
      "";
    for (let index = 0; index < count; index += 1) {
      cursor = form.weeks.length || index ? nextWeekStart(cursor) : cursor;
      added.push(blankWeek(cursor));
    }
    update("weeks", [...form.weeks, ...added]);
  };
  const removeWeek = (id: string) =>
    update(
      "weeks",
      form.weeks.filter((week) => week.id !== id)
    );
  const updateWeek = (
    id: string,
    key: keyof PlanWeekFormState,
    value: string
  ) =>
    update(
      "weeks",
      form.weeks.map((week) =>
        week.id === id ? { ...week, [key]: value } : week
      )
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly progression</CardTitle>
        <CardDescription>
          Weekly arrow targets are authoritative. Daily and monthly totals are
          calculated from them.
        </CardDescription>
        <CardAction>
          <ButtonGroup>
            <Button
              onClick={() => appendWeeks(1)}
              size="sm"
              type="button"
              variant="outline"
            >
              <PlusIcon aria-hidden="true" /> Add week
            </Button>
            <Button
              onClick={() => appendWeeks(4)}
              size="sm"
              type="button"
              variant="outline"
            >
              Add 4 weeks
            </Button>
          </ButtonGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div aria-live="polite" className="sr-only" id="plan-weeks-count">
          {form.weeks.length} planned weeks
        </div>
        {form.weeks.map((week, index) => {
          const arrowsId = `week-${week.id}-arrows`;
          const daysId = `week-${week.id}-days`;
          const startId = `week-${week.id}-start`;
          return (
            <fieldset
              className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
              key={week.id}
            >
              <legend className="px-1 text-sm font-medium">
                Week {index + 1}
              </legend>
              <Field>
                <FieldLabel htmlFor={startId}>Week start</FieldLabel>
                <DatePicker
                  errorMessageId={errorId(startId)}
                  id={startId}
                  invalid={Boolean(errors[startId])}
                  onChange={(value) => updateWeek(week.id, "weekStart", value)}
                  value={week.weekStart}
                />
                <FieldError id={errorId(startId)}>{errors[startId]}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor={arrowsId}>Arrows planned</FieldLabel>
                <Input
                  id={arrowsId}
                  inputMode="numeric"
                  onChange={(event) =>
                    updateWeek(week.id, "arrowsPlanned", event.target.value)
                  }
                  value={week.arrowsPlanned}
                  {...fieldProps(arrowsId, errors)}
                />
                <FieldError id={errorId(arrowsId)}>
                  {errors[arrowsId]}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor={daysId}>Training days</FieldLabel>
                <Input
                  id={daysId}
                  inputMode="numeric"
                  onChange={(event) =>
                    updateWeek(
                      week.id,
                      "trainingDaysPlanned",
                      event.target.value
                    )
                  }
                  value={week.trainingDaysPlanned}
                  {...fieldProps(daysId, errors)}
                />
                <FieldError id={errorId(daysId)}>{errors[daysId]}</FieldError>
                <p className="text-muted-foreground text-xs">
                  {perTrainingDay(week)}
                </p>
              </Field>
              <div className="flex items-end gap-2">
                <Field className="flex-1">
                  <FieldLabel htmlFor={`week-${week.id}-focus`}>
                    Technical focus
                  </FieldLabel>
                  <Input
                    id={`week-${week.id}-focus`}
                    onChange={(event) =>
                      updateWeek(week.id, "technicalFocus", event.target.value)
                    }
                    value={week.technicalFocus}
                  />
                </Field>
                <Button
                  aria-label={`Remove week ${index + 1}`}
                  disabled={form.weeks.length === 1}
                  onClick={() => removeWeek(week.id)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <TrashIcon aria-hidden="true" />
                </Button>
              </div>
            </fieldset>
          );
        })}
        <div id="plan-weeks" tabIndex={-1}>
          <FieldError id={errorId("plan-weeks")}>
            {errors["plan-weeks"]}
          </FieldError>
        </div>
      </CardContent>
    </Card>
  );
};
