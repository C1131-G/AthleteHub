"use client";

import { ArrowLeftIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAthletes } from "@/features/athlete/use-athletes";

import type { WeeklyPerformanceReportInput } from "../report-types";
import { useReports } from "../use-reports";
import { focusFirstError } from "./report-form-errors";
import type { ReportFormErrors } from "./report-form-errors";
import { WeeklyReportFields } from "./weekly-report-fields";
import type { WeeklyFormState } from "./weekly-report-fields";

interface WeeklyReportFormProps {
  reportId?: string;
}

const blankState = (athleteId = ""): WeeklyFormState => ({
  absenceReason: "",
  actionItems: "",
  arrowsPlanned: "",
  arrowsShot: "",
  athleteId,
  distanceM: "",
  maxScore: "360",
  performanceNotes: "",
  scores: ["", "", "", ""],
  status: "completed",
  trainingDays: "",
  weekStart: "",
});

const parseNumber = (value: string) => {
  if (!value.trim()) {
    return;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

export const WeeklyReportForm = ({ reportId }: WeeklyReportFormProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { athletes, ready: athletesReady } = useAthletes();
  const {
    createWeekly,
    getWeekly,
    ready: reportsReady,
    updateWeekly,
  } = useReports();
  const existing = reportId ? getWeekly(reportId) : undefined;
  const [form, setForm] = useState<WeeklyFormState>(() => {
    if (!existing) {
      return blankState(athletes[0]?.id ?? "");
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

  if (!athletesReady || !reportsReady) {
    return <WeeklyReportFormSkeleton />;
  }
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
    const nextErrors: ReportFormErrors = {};
    const today = new Date().toISOString().slice(0, 10);
    if (!form.athleteId) {
      nextErrors.athleteId = "Select an athlete.";
    }
    if (!form.weekStart) {
      nextErrors.weekStart = "Choose the week start date.";
    }
    if (form.weekStart > today) {
      nextErrors.weekStart = "The week start cannot be in the future.";
    }
    if (
      ["medical-leave", "absent"].includes(form.status) &&
      !form.absenceReason.trim()
    ) {
      nextErrors.absenceReason = "Add a reason for leave or absence.";
    }
    const distanceM = parseNumber(form.distanceM);
    const maxScore = parseNumber(form.maxScore);
    const scores = form.scores
      .map(parseNumber)
      .filter((score): score is number => score !== undefined);
    if (form.status === "completed" || form.status === "competition") {
      if (!distanceM || distanceM <= 0) {
        nextErrors.distanceM = "Distance must be positive.";
      }
      if (!maxScore || maxScore <= 0) {
        nextErrors.maxScore = "Maximum score must be positive.";
      }
      if (!scores.length) {
        nextErrors.scores = "Add at least one score.";
      }
      if (maxScore && scores.some((score) => score < 0 || score > maxScore)) {
        nextErrors.scores = "Scores must be within the maximum score.";
      }
    }
    const trainingDays = parseNumber(form.trainingDays);
    if (trainingDays !== undefined && (trainingDays < 0 || trainingDays > 7)) {
      nextErrors.trainingDays = "Training days must be between 0 and 7.";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }
    const input: WeeklyPerformanceReportInput = {
      absenceReason: form.absenceReason,
      actionItems: form.actionItems.split("\n").filter(Boolean),
      arrowsPlanned: parseNumber(form.arrowsPlanned),
      arrowsShot: parseNumber(form.arrowsShot),
      athleteId: form.athleteId,
      distanceM,
      equipmentSetupId: undefined,
      maxScore,
      performanceNotes: form.performanceNotes,
      scores,
      status: form.status,
      trainingDays,
      weekStart: form.weekStart,
    };
    startTransition(() => {
      const result = reportId
        ? updateWeekly(reportId, input)
        : createWeekly(input);
      if (result.status === "saved") {
        router.push(`/reports/weekly/${result.report.id}`);
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
      <WeeklyReportFields errors={errors} form={form} update={update} />
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
