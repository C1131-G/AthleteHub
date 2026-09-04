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
import { AthletePicker } from "@/features/athlete/athlete-picker";
import type {
  SeasonTrainingPlan,
  TrainingPlanWeek,
} from "@/features/training-plan/training-plan-types";

import type { SessionWeekSummary } from "../report-calculations";
import { weeklyEntryStatuses } from "../report-types";
import type { WeeklyEntryStatus } from "../report-types";
import { errorId, fieldProps } from "./report-form-errors";
import type { ReportFormErrors } from "./report-form-errors";
import { WeeklyAbsenceField } from "./weekly-absence-field";
import { WeeklyScoringFields } from "./weekly-scoring-fields";

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

export interface PlanWeekMatch {
  plan: SeasonTrainingPlan;
  week: TrainingPlanWeek;
}

interface WeeklyReportFieldsProps {
  errors: ReportFormErrors;
  form: WeeklyFormState;
  onFillFromSessions: () => void;
  planWeek?: PlanWeekMatch | undefined;
  sessionSummary?: SessionWeekSummary | undefined;
  update: UpdateField;
}

export const WeeklyReportFields = ({
  errors,
  form,
  onFillFromSessions,
  planWeek,
  sessionSummary,
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
              errorMessageId={errorId("weekly-athlete")}
              id="weekly-athlete"
              invalid={Boolean(errors["weekly-athlete"])}
              onChange={(value) => update("athleteId", value)}
              value={form.athleteId}
            />
            <FieldError id={errorId("weekly-athlete")}>
              {errors["weekly-athlete"]}
            </FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="week-start">Week start</FieldLabel>
            <DatePicker
              errorMessageId={errorId("week-start")}
              id="week-start"
              invalid={Boolean(errors["week-start"])}
              onChange={(value) => update("weekStart", value)}
              value={form.weekStart}
            />
            <FieldError id={errorId("week-start")}>
              {errors["week-start"]}
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
              {...fieldProps("weekly-distance", errors)}
              disabled={!showScores}
              id="weekly-distance"
              inputMode="numeric"
              onChange={(event) => update("distanceM", event.target.value)}
              value={form.distanceM}
            />
            <FieldError id={errorId("weekly-distance")}>
              {errors["weekly-distance"]}
            </FieldError>
          </Field>
        </CardContent>
      </Card>
      {showScores ? (
        <WeeklyScoringFields
          errors={errors}
          form={form}
          onFillFromSessions={onFillFromSessions}
          planWeek={planWeek}
          sessionSummary={sessionSummary}
          update={update}
        />
      ) : (
        <WeeklyAbsenceField errors={errors} form={form} update={update} />
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
