"use client";

import { FloppyDiskIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAthletes } from "@/features/athlete/use-athletes";
import {
  activeProgrammeFor,
  latestAssessmentFor,
} from "@/features/conditioning/conditioning-calculations";
import { useConditioning } from "@/features/conditioning/use-conditioning";
import {
  planForMonth,
  weeklyArrowTargetsForMonth,
} from "@/features/training-plan/training-plan-calculations";
import { useTrainingPlans } from "@/features/training-plan/use-training-plans";

import { createMonthlyDraft, nextMonthOf } from "../report-calculations";
import type { MonthlyPerformanceReportInput } from "../report-types";
import { useReports } from "../use-reports";
import { MonthlyReportFields } from "./monthly-report-fields";
import type { MonthlyFormState } from "./monthly-report-fields";
import { MonthlyReportFormSkeleton } from "./monthly-report-form-skeleton";
import { numberOrUndefined, toState } from "./monthly-report-form-support";
import type { MonthlyReportFormProps } from "./monthly-report-form-support";
import {
  focusFirstError,
  monthlyControls,
  toFormErrors,
} from "./report-form-errors";
import type { ReportFormErrors } from "./report-form-errors";

export const MonthlyReportForm = ({
  reportId,
  initialAthleteId,
  initialMonth,
}: MonthlyReportFormProps) => {
  const { ready: athletesReady } = useAthletes();
  const { ready: reportsReady } = useReports();
  const { ready: plansReady } = useTrainingPlans();
  const { ready: conditioningReady } = useConditioning();

  if (!(athletesReady && plansReady && reportsReady && conditioningReady)) {
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
  const {
    assessments: conditioningAssessments,
    programmes: conditioningProgrammes,
  } = useConditioning();
  const { plans } = useTrainingPlans();
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
  // The next-month plan takes its weekly targets from whichever season plan
  // covers that month; the stored array stays as the compatibility snapshot.
  const targetMonth = nextMonthOf(form.month);
  const coveringPlan =
    form.athleteId && targetMonth
      ? planForMonth(plans, form.athleteId, targetMonth)
      : undefined;
  const derivedTargets = coveringPlan
    ? weeklyArrowTargetsForMonth(coveringPlan, targetMonth)
    : [];
  const planTargets =
    coveringPlan && derivedTargets.length
      ? {
          planId: coveringPlan.id,
          planName: coveringPlan.name,
          targets: derivedTargets,
        }
      : undefined;

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
    const weeklyArrowTargets = (
      planTargets ? planTargets.targets.join(", ") : form.weeklyArrowTargets
    )
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
      const formErrors = toFormErrors(nextErrors, monthlyControls);
      setErrors(formErrors);
      focusFirstError(formErrors);
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
        // Resolved at save time so the report keeps pointing at the records
        // that were current for this athlete and month.
        conditioningAssessmentId:
          latestAssessmentFor(
            conditioningAssessments,
            form.athleteId,
            form.month
          )?.id ?? draft.assessments.conditioningAssessmentId,
        conditioningPlan: form.conditioningPlan.trim(),
        conditioningProgrammeId:
          activeProgrammeFor(conditioningProgrammes, form.athleteId, form.month)
            ?.id ?? draft.assessments.conditioningProgrammeId,
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
    startTransition(async () => {
      const result = reportId
        ? await updateMonthly(reportId, input)
        : await createMonthly(input);
      if (result.status === "saved") {
        router.push(`/reports/monthly/${result.record.id}`);
      } else {
        const saveErrors = toFormErrors(result.fieldErrors, monthlyControls);
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
          id="monthly-error-summary"
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
      <MonthlyReportFields
        errors={errors}
        form={form}
        planTargets={planTargets}
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
