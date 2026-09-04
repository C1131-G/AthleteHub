"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { trainingPlanHref } from "@/features/training-plan/training-plan-routes";

import type { SessionWeekSummary } from "../report-calculations";
import { errorId, fieldProps } from "./report-form-errors";
import type { ReportFormErrors } from "./report-form-errors";
import type { PlanWeekMatch, WeeklyFormState } from "./weekly-report-fields";

interface WeeklyScoringFieldsProps {
  errors: ReportFormErrors;
  form: WeeklyFormState;
  onFillFromSessions: () => void;
  planWeek?: PlanWeekMatch | undefined;
  sessionSummary?: SessionWeekSummary | undefined;
  update: <K extends keyof WeeklyFormState>(
    key: K,
    value: WeeklyFormState[K]
  ) => void;
}

export const WeeklyScoringFields = ({
  errors,
  form,
  onFillFromSessions,
  planWeek,
  sessionSummary,
  update,
}: WeeklyScoringFieldsProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Scoring and load</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="max-score">Maximum score per round</FieldLabel>
          <Input
            {...fieldProps("max-score", errors)}
            id="max-score"
            inputMode="numeric"
            onChange={(event) => update("maxScore", event.target.value)}
            value={form.maxScore}
          />
          <FieldError id={errorId("max-score")}>
            {errors["max-score"]}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="training-days">Training days</FieldLabel>
          <Input
            {...fieldProps("training-days", errors)}
            id="training-days"
            inputMode="numeric"
            onChange={(event) => update("trainingDays", event.target.value)}
            value={form.trainingDays}
          />
          <FieldError id={errorId("training-days")}>
            {errors["training-days"]}
          </FieldError>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {form.scores.map((score, fieldIndex) => {
          const field = ["one", "two", "three", "four"][fieldIndex] ?? "one";
          const invalid = field === "one" && Boolean(errors["score-one"]);
          return (
            <Field key={field}>
              <FieldLabel htmlFor={`score-${field}`}>
                Scoring {fieldIndex + 1}
              </FieldLabel>
              <Input
                aria-errormessage={invalid ? errorId("score-one") : undefined}
                aria-invalid={invalid || undefined}
                id={`score-${field}`}
                inputMode="numeric"
                onChange={(event) =>
                  update(
                    "scores",
                    form.scores.with(fieldIndex, event.target.value)
                  )
                }
                value={score}
              />
            </Field>
          );
        })}
      </div>
      <FieldError id={errorId("score-one")}>{errors["score-one"]}</FieldError>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="arrows-planned">Arrows planned</FieldLabel>
          <Input
            id="arrows-planned"
            inputMode="numeric"
            onChange={(event) => update("arrowsPlanned", event.target.value)}
            readOnly={Boolean(planWeek)}
            value={
              planWeek
                ? String(planWeek.week.arrowsPlanned)
                : form.arrowsPlanned
            }
          />
          {planWeek ? (
            <p className="text-muted-foreground text-xs">
              Target from{" "}
              <Link
                className="underline underline-offset-2"
                href={trainingPlanHref(planWeek.plan.id)}
              >
                {planWeek.plan.name}
              </Link>
              . Edit the plan to change it.
            </p>
          ) : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="arrows-shot">Arrows shot</FieldLabel>
          <Input
            id="arrows-shot"
            inputMode="numeric"
            value={form.arrowsShot}
            onChange={(event) => update("arrowsShot", event.target.value)}
          />
          {sessionSummary && sessionSummary.arrowsShot > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground text-xs">
                {sessionSummary.arrowsShot} arrows across{" "}
                {sessionSummary.trainingDays} training{" "}
                {sessionSummary.trainingDays === 1 ? "day" : "days"} recorded in
                sessions.
              </p>
              <Button
                onClick={onFillFromSessions}
                size="sm"
                type="button"
                variant="outline"
              >
                Fill from sessions
              </Button>
            </div>
          ) : null}
        </Field>
      </div>
    </CardContent>
  </Card>
);
