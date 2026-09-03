"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trainingPlanHref } from "@/features/training-plan/training-plan-routes";

import { errorId, fieldProps } from "./report-form-errors";
import type { ReportFormErrors } from "./report-form-errors";

export interface MonthlyFormState {
  actionItems: string;
  athleteId: string;
  coachSummary: string;
  conditioningPlan: string;
  dartfishNotes: string;
  exceptionReason: string;
  month: string;
  performanceHighlights: string;
  planNotes: string;
  status: "draft" | "complete";
  targetDistanceM: string;
  targetScore: string;
  weeklyArrowTargets: string;
}

type UpdateField = (key: keyof MonthlyFormState, value: string) => void;

/** Weekly targets taken from the training plan that covers the next month. */
export interface PlanArrowTargets {
  planId: string;
  planName: string;
  targets: number[];
}

export const MonthlyReportFields = ({
  errors,
  form,
  planTargets,
  update,
}: {
  errors: ReportFormErrors;
  form: MonthlyFormState;
  planTargets?: PlanArrowTargets | undefined;
  update: UpdateField;
}) => (
  <>
    <Card>
      <CardHeader>
        <CardTitle>Report details</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="monthly-athlete">Athlete</FieldLabel>
          <AthletePicker
            errorMessageId={errorId("monthly-athlete")}
            id="monthly-athlete"
            invalid={Boolean(errors["monthly-athlete"])}
            onChange={(value) => update("athleteId", value)}
            value={form.athleteId}
          />
          <FieldError id={errorId("monthly-athlete")}>
            {errors["monthly-athlete"]}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="report-month">Month</FieldLabel>
          <Input
            {...fieldProps("report-month", errors)}
            id="report-month"
            onChange={(event) => update("month", event.target.value)}
            type="month"
            value={form.month}
          />
          <FieldError id={errorId("report-month")}>
            {errors["report-month"]}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="monthly-status">Status</FieldLabel>
          <Select
            value={form.status}
            onValueChange={(value) =>
              update("status", value === "complete" ? "complete" : "draft")
            }
          >
            <SelectTrigger id="monthly-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>Coach summary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Field>
          <FieldLabel htmlFor="coach-summary">Summary</FieldLabel>
          <Textarea
            {...fieldProps("coach-summary", errors)}
            id="coach-summary"
            onChange={(event) => update("coachSummary", event.target.value)}
            value={form.coachSummary}
          />
          <FieldError id={errorId("coach-summary")}>
            {errors["coach-summary"]}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="highlights">Performance highlights</FieldLabel>
          <Textarea
            id="highlights"
            value={form.performanceHighlights}
            onChange={(event) =>
              update("performanceHighlights", event.target.value)
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="monthly-actions">Action items</FieldLabel>
          <Textarea
            id="monthly-actions"
            placeholder="One action item per line"
            value={form.actionItems}
            onChange={(event) => update("actionItems", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="exception">Exception reason</FieldLabel>
          <Textarea
            id="exception"
            value={form.exceptionReason}
            onChange={(event) => update("exceptionReason", event.target.value)}
          />
        </Field>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>Next-month plan</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="arrow-targets">Weekly arrow targets</FieldLabel>
          <Input
            {...fieldProps("arrow-targets", errors)}
            id="arrow-targets"
            onChange={(event) =>
              update("weeklyArrowTargets", event.target.value)
            }
            placeholder="1200, 1400, 1600"
            readOnly={Boolean(planTargets)}
            value={
              planTargets
                ? planTargets.targets.join(", ")
                : form.weeklyArrowTargets
            }
          />
          {planTargets ? (
            <p className="text-muted-foreground text-xs">
              Derived from{" "}
              <Link
                className="underline underline-offset-2"
                href={trainingPlanHref(planTargets.planId)}
              >
                {planTargets.planName}
              </Link>
              . Edit the plan to change these targets.
            </p>
          ) : null}
          <FieldError id={errorId("arrow-targets")}>
            {errors["arrow-targets"]}
          </FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="target-distance">Target distance (m)</FieldLabel>
          <Input
            id="target-distance"
            inputMode="numeric"
            value={form.targetDistanceM}
            onChange={(event) => update("targetDistanceM", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="target-score">Target score</FieldLabel>
          <Input
            id="target-score"
            inputMode="numeric"
            value={form.targetScore}
            onChange={(event) => update("targetScore", event.target.value)}
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="plan-notes">Plan notes</FieldLabel>
          <Textarea
            id="plan-notes"
            value={form.planNotes}
            onChange={(event) => update("planNotes", event.target.value)}
          />
        </Field>
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>Assessments</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="dartfish-notes">
            Dartfish technical notes
          </FieldLabel>
          <Textarea
            id="dartfish-notes"
            value={form.dartfishNotes}
            onChange={(event) => update("dartfishNotes", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="conditioning-plan">Conditioning plan</FieldLabel>
          <Textarea
            id="conditioning-plan"
            value={form.conditioningPlan}
            onChange={(event) => update("conditioningPlan", event.target.value)}
          />
        </Field>
      </CardContent>
    </Card>
  </>
);
