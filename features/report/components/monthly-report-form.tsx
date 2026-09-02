"use client";

import { FloppyDiskIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAthletes } from "@/features/athlete/use-athletes";

import { createMonthlyDraft } from "../report-calculations";
import type { MonthlyPerformanceReportInput } from "../report-types";
import { useReports } from "../use-reports";
import { MonthlyReportFields } from "./monthly-report-fields";
import type { MonthlyFormState } from "./monthly-report-fields";
import { focusFirstError } from "./report-form-errors";
import type { ReportFormErrors } from "./report-form-errors";

interface MonthlyReportFormProps {
  reportId?: string;
  initialAthleteId?: string;
  initialMonth?: string;
}

const toState = (input: MonthlyPerformanceReportInput): MonthlyFormState => ({
  actionItems: input.actionItems.join("\n"),
  athleteId: input.athleteId,
  coachSummary: input.coachSummary,
  conditioningPlan: input.assessments.conditioningPlan,
  dartfishNotes: input.assessments.dartfishNotes,
  exceptionReason: input.exceptionReason,
  month: input.month,
  performanceHighlights: input.performanceHighlights,
  planNotes: input.nextMonthPlan.notes,
  status: input.status,
  targetDistanceM: String(input.nextMonthPlan.targetDistanceM ?? ""),
  targetScore: String(input.nextMonthPlan.targetScore ?? ""),
  weeklyArrowTargets: input.nextMonthPlan.weeklyArrowTargets.join(", "),
});

const numberOrUndefined = (value: string) => {
  if (!value.trim()) {
    return;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

export const MonthlyReportForm = ({
  reportId,
  initialAthleteId,
  initialMonth,
}: MonthlyReportFormProps) => {
  const { ready: athletesReady } = useAthletes();
  const { ready: reportsReady } = useReports();

  if (!(athletesReady && reportsReady)) {
    return <MonthlyReportFormSkeleton />;
  }

  return (
    <MonthlyReportFormBody
      initialAthleteId={initialAthleteId}
      initialMonth={initialMonth}
      reportId={reportId}
    />
  );
};

const MonthlyReportFormBody = ({
  reportId,
  initialAthleteId,
  initialMonth,
}: MonthlyReportFormProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { athletes } = useAthletes();
  const { createMonthly, getMonthly, listMonthly, updateMonthly } =
    useReports();
  const existing = reportId ? getMonthly(reportId) : undefined;
  const [form, setForm] = useState<MonthlyFormState>(() =>
    toState(
      existing ??
        createMonthlyDraft(
          initialAthleteId ?? athletes[0]?.id ?? "",
          initialMonth ?? ""
        )
    )
  );
  const [errors, setErrors] = useState<ReportFormErrors>({});
  if (reportId && !existing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly report not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} href="/reports">
            Back to reports
          </Link>
        </CardContent>
      </Card>
    );
  }
  const update = (key: keyof MonthlyFormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: ReportFormErrors = {};
    if (!form.athleteId) {
      nextErrors.athleteId = "Select an athlete.";
    }
    if (!/^\d{4}-\d{2}$/.test(form.month)) {
      nextErrors.month = "Choose a month.";
    }
    if (form.month > new Date().toISOString().slice(0, 7)) {
      nextErrors.month = "The report month cannot be in the future.";
    }
    if (
      listMonthly.some(
        (item) =>
          item.id !== reportId &&
          item.athleteId === form.athleteId &&
          item.month === form.month
      )
    ) {
      nextErrors.month =
        "A monthly report already exists for this athlete and month.";
    }
    if (
      form.status === "complete" &&
      !form.coachSummary.trim() &&
      !form.exceptionReason.trim()
    ) {
      nextErrors.coachSummary =
        "Complete reports require a coach summary or exception reason.";
    }
    const targetDistanceM = numberOrUndefined(form.targetDistanceM);
    const targetScore = numberOrUndefined(form.targetScore);
    if (targetDistanceM !== undefined && targetDistanceM <= 0) {
      nextErrors.targetDistanceM = "Target distance must be positive.";
    }
    if (targetScore !== undefined && targetScore <= 0) {
      nextErrors.targetScore = "Target score must be positive.";
    }
    const weeklyArrowTargets = form.weeklyArrowTargets
      .split(",")
      .flatMap((value) => {
        const number = Number(value.trim());
        if (Number.isInteger(number) && number >= 0) {
          return [number];
        }
        return value.trim() ? [Number.NaN] : [];
      });
    if (weeklyArrowTargets.some((value) => Number.isNaN(value))) {
      nextErrors.weeklyArrowTargets =
        "Weekly arrow targets must be non-negative integers.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }
    const draft = createMonthlyDraft(form.athleteId, form.month, existing);
    const input: MonthlyPerformanceReportInput = {
      ...draft,
      actionItems: form.actionItems
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      assessments: {
        ...draft.assessments,
        conditioningPlan: form.conditioningPlan.trim(),
        dartfishNotes: form.dartfishNotes.trim(),
      },
      coachSummary: form.coachSummary.trim(),
      exceptionReason: form.exceptionReason.trim(),
      nextMonthPlan: {
        notes: form.planNotes.trim(),
        targetDistanceM,
        targetScore,
        weeklyArrowTargets,
      },
      performanceHighlights: form.performanceHighlights.trim(),
      status: form.status,
    };
    startTransition(() => {
      const result = reportId
        ? updateMonthly(reportId, input)
        : createMonthly(input);
      if (result.status === "saved") {
        router.push(`/reports/monthly/${result.report.id}`);
      } else {
        setErrors(result.fieldErrors);
        focusFirstError(result.fieldErrors);
      }
    });
  };
  return (
    <form className="space-y-6" onSubmit={submit} noValidate>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">
            {reportId ? "Edit monthly report" : "New monthly report"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Weekly entries remain the source for calculated scores and load.
          </p>
        </div>
        <Link className={buttonVariants({ variant: "ghost" })} href="/reports">
          Cancel
        </Link>
      </div>
      {Object.keys(errors).length > 0 && (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4"
          role="alert"
        >
          <p className="font-medium">Check the report before saving.</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <MonthlyReportFields errors={errors} form={form} update={update} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <FloppyDiskIcon /> {pending ? "Saving…" : "Save report"}
        </Button>
      </div>
    </form>
  );
};

export const MonthlyReportFormSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-muted h-10 w-72 animate-pulse rounded-xl" />
    <div className="bg-muted h-64 animate-pulse rounded-xl" />
    <div className="bg-muted h-80 animate-pulse rounded-xl" />
  </div>
);
