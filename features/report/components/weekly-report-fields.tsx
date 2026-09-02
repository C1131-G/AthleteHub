"use client";

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

import { weeklyEntryStatuses } from "../report-types";
import type { WeeklyEntryStatus } from "../report-types";
import { AthletePicker } from "./athlete-picker";
import { errorId } from "./report-form-errors";
import type { ReportFormErrors } from "./report-form-errors";

export interface WeeklyFormState {
  absenceReason: string;
  actionItems: string;
  arrowsPlanned: string;
  arrowsShot: string;
  athleteId: string;
  distanceM: string;
  maxScore: string;
  performanceNotes: string;
  scores: string[];
  status: WeeklyEntryStatus;
  trainingDays: string;
  weekStart: string;
}

type UpdateField = <K extends keyof WeeklyFormState>(
  key: K,
  value: WeeklyFormState[K]
) => void;

interface WeeklyReportFieldsProps {
  errors: ReportFormErrors;
  form: WeeklyFormState;
  update: UpdateField;
}

export const WeeklyReportFields = ({
  errors,
  form,
  update,
}: WeeklyReportFieldsProps) => {
  const showScores =
    form.status === "completed" || form.status === "competition";
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Weekly details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="weekly-athlete">Athlete</FieldLabel>
            <AthletePicker
              id="weekly-athlete"
              value={form.athleteId}
              onChange={(value) => update("athleteId", value)}
            />
            <FieldError id={errorId("weekly-athlete")}>
              {errors.athleteId}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="week-start">Week start</FieldLabel>
            <DatePicker
              id="week-start"
              value={form.weekStart}
              onChange={(value) => update("weekStart", value)}
            />
            <FieldError id={errorId("week-start")}>
              {errors.weekStart}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="weekly-status">Entry status</FieldLabel>
            <Select
              value={form.status}
              onValueChange={(value) => {
                const status = weeklyEntryStatuses.find(
                  (item) => item === value
                );
                update("status", status ?? "completed");
              }}
            >
              <SelectTrigger id="weekly-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weeklyEntryStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace("-", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="weekly-distance">Distance (m)</FieldLabel>
            <Input
              id="weekly-distance"
              inputMode="numeric"
              value={form.distanceM}
              onChange={(event) => update("distanceM", event.target.value)}
              disabled={!showScores}
            />
          </Field>
        </CardContent>
      </Card>
      {showScores ? (
        <ScoringFields form={form} update={update} />
      ) : (
        <AbsenceField errors={errors} form={form} update={update} />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Coach notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="action-items">Action items</FieldLabel>
            <Textarea
              id="action-items"
              placeholder="One action item per line"
              value={form.actionItems}
              onChange={(event) => update("actionItems", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="performance-notes">
              Performance notes
            </FieldLabel>
            <Textarea
              id="performance-notes"
              value={form.performanceNotes}
              onChange={(event) =>
                update("performanceNotes", event.target.value)
              }
            />
          </Field>
        </CardContent>
      </Card>
    </>
  );
};

const ScoringFields = ({
  form,
  update,
}: Omit<WeeklyReportFieldsProps, "errors">) => (
  <Card>
    <CardHeader>
      <CardTitle>Scoring and load</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="max-score">Maximum score per round</FieldLabel>
          <Input
            id="max-score"
            inputMode="numeric"
            value={form.maxScore}
            onChange={(event) => update("maxScore", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="training-days">Training days</FieldLabel>
          <Input
            id="training-days"
            inputMode="numeric"
            value={form.trainingDays}
            onChange={(event) => update("trainingDays", event.target.value)}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {form.scores.map((score, fieldIndex) => {
          const field = ["one", "two", "three", "four"][fieldIndex] ?? "one";
          return (
            <Field key={field}>
              <FieldLabel htmlFor={`score-${field}`}>
                Scoring {fieldIndex + 1}
              </FieldLabel>
              <Input
                id={`score-${field}`}
                inputMode="numeric"
                value={score}
                onChange={(event) =>
                  update(
                    "scores",
                    form.scores.with(fieldIndex, event.target.value)
                  )
                }
              />
            </Field>
          );
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="arrows-planned">Arrows planned</FieldLabel>
          <Input
            id="arrows-planned"
            inputMode="numeric"
            value={form.arrowsPlanned}
            onChange={(event) => update("arrowsPlanned", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="arrows-shot">Arrows shot</FieldLabel>
          <Input
            id="arrows-shot"
            inputMode="numeric"
            value={form.arrowsShot}
            onChange={(event) => update("arrowsShot", event.target.value)}
          />
        </Field>
      </div>
    </CardContent>
  </Card>
);

const AbsenceField = ({
  errors,
  form,
  update,
}: Omit<WeeklyReportFieldsProps, "pending">) => (
  <Card>
    <CardContent className="pt-6">
      <Field>
        <FieldLabel htmlFor="absence-reason">
          Leave or absence reason
        </FieldLabel>
        <Textarea
          id="absence-reason"
          value={form.absenceReason}
          onChange={(event) => update("absenceReason", event.target.value)}
        />
        <FieldError>{errors.absenceReason}</FieldError>
      </Field>
    </CardContent>
  </Card>
);
