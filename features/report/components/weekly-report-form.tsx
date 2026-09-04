"use client";

import { ArrowLeftIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAthletes } from "@/features/athlete/use-athletes";
import { planWeekFor } from "@/features/training-plan/training-plan-calculations";
import { useTrainingPlans } from "@/features/training-plan/use-training-plans";

import { useReports } from "../use-reports";
import {
  blankWeeklyFormState,
  validateWeeklyForm,
  weeklyInputFromForm,
} from "../weekly-report-form-state";
import {
  focusFirstError,
  toFormErrors,
  weeklyControls,
} from "./report-form-errors";
import type { ReportFormErrors } from "./report-form-errors";
import { useSessionSummary } from "./use-session-summary";
import { WeeklyReportFields } from "./weekly-report-fields";
import type { WeeklyFormState } from "./weekly-report-fields";

interface WeeklyReportFormProps {
  reportId?: string | undefined;
}

/**
 * Gate only. The fields below seed their state from the queries on first render,
 * so they must not mount until those stores hold real data.
 */
export const WeeklyReportForm = ({ reportId }: WeeklyReportFormProps) => {
  const { ready: athletesReady } = useAthletes();
  const { ready: reportsReady } = useReports();
  const { ready: plansReady } = useTrainingPlans();

  if (!(athletesReady && plansReady && reportsReady)) {
    return <WeeklyReportFormSkeleton />;
  }

  return <WeeklyReportFormBody reportId={reportId} />;
};

const WeeklyReportFormBody = ({ reportId }: WeeklyReportFormProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { athletes } = useAthletes();
  const { createWeekly, getWeekly, updateWeekly } = useReports();
  const { plans } = useTrainingPlans();
  const existing = reportId ? getWeekly(reportId) : undefined;
  const [form, setForm] = useState<WeeklyFormState>(() => {
    if (!existing) {
      return blankWeeklyFormState(athletes[0]?.id ?? "");
    }
    return {
      absenceReason: existing.absenceReason,
      actionItems: existing.actionItems.join("\n"),
      arrowsPlanned: String(existing.arrowsPlanned ?? ""),
      arrowsShot: String(existing.arrowsShot ?? ""),
      athleteId: existing.athleteId,
      distanceM: String(existing.distanceM ?? ""),
      maxScore: String(existing.maxScore ?? 360),
      performanceNotes: existing.performanceNotes,
      scores: [...existing.scores.map(String), "", "", "", ""].slice(0, 4),
      status: existing.status,
      trainingDays: String(existing.trainingDays ?? ""),
      weekStart: existing.weekStart,
    };
  });
  const [errors, setErrors] = useState<ReportFormErrors>({});
  // A plan week matching this athlete and week owns the arrow target; the
  // report keeps its own copy so the history survives later plan edits.
  const planWeek = planWeekFor(plans, form.athleteId, form.weekStart);
  const sessionSummary = useSessionSummary(form.athleteId, form.weekStart);
  const fillFromSessions = () => {
    if (!sessionSummary) {
      return;
    }
    update("arrowsShot", String(sessionSummary.arrowsShot));
    update("trainingDays", String(sessionSummary.trainingDays));
    if (sessionSummary.distanceM !== undefined) {
      update("distanceM", String(sessionSummary.distanceM));
    }
  };

  if (reportId && !existing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly report not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} href="/reports">
            Back to reports
          </Link>
        </CardContent>
      </Card>
    );
  }

  const update = <K extends keyof WeeklyFormState>(
    key: K,
    value: WeeklyFormState[K]
  ) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = toFormErrors(validateWeeklyForm(form), weeklyControls);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }
    const input = weeklyInputFromForm(form, planWeek);
    startTransition(async () => {
      const result = reportId
        ? await updateWeekly(reportId, input)
        : await createWeekly(input);
      if (result.status === "saved") {
        router.push(`/reports/weekly/${result.record.id}`);
      } else {
        const saveErrors = toFormErrors(result.fieldErrors, weeklyControls);
        setErrors(saveErrors);
        focusFirstError(saveErrors);
      }
    });
  };

  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">
            {reportId ? "Edit weekly report" : "New weekly report"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Record one weekly performance entry.
          </p>
        </div>
        <Link className={buttonVariants({ variant: "ghost" })} href="/reports">
          <ArrowLeftIcon /> Cancel
        </Link>
      </div>
      {Object.keys(errors).length > 0 && (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4"
          id="weekly-error-summary"
          role="alert"
        >
          <p className="font-medium">Check the report before saving.</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {Object.entries(errors).map(([controlId, error]) => (
              <li key={controlId}>
                <a className="underline" href={`#${controlId}`}>
                  {error}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <WeeklyReportFields
        errors={errors}
        form={form}
        onFillFromSessions={fillFromSessions}
        planWeek={planWeek}
        sessionSummary={sessionSummary}
        update={update}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <FloppyDiskIcon /> {pending ? "Saving…" : "Save report"}
        </Button>
      </div>
    </form>
  );
};

export const WeeklyReportFormSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-muted h-10 w-72 animate-pulse rounded-xl" />
    <div className="bg-muted h-64 animate-pulse rounded-xl" />
    <div className="bg-muted h-80 animate-pulse rounded-xl" />
  </div>
);
