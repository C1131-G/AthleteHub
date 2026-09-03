"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { focusFirstError } from "@/features/report/report-form-errors";
import type { ReportFormErrors } from "@/features/report/report-form-errors";
import { useReports } from "@/features/report/use-reports";
import { WeeklyReportFields } from "@/features/report/weekly-report-fields";
import type { WeeklyFormState } from "@/features/report/weekly-report-fields";
import {
  blankWeeklyFormState,
  validateWeeklyForm,
  weeklyFormStateFromReport,
  weeklyInputFromForm,
} from "@/features/report/weekly-report-form-state";
import { planWeekFor } from "@/features/training-plan/training-plan-calculations";
import { useTrainingPlans } from "@/features/training-plan/use-training-plans";
import { formatDate } from "@/lib/format";

import { confirmCycleStep } from "../cycle-step-actions";
import {
  expectedMondays,
  setupEffectiveBy,
  weeklyCoverageFor,
} from "../monthly-cycle-lifecycle";
import type {
  CycleDomainContext,
  CycleStepView,
  WeeklyCoverageEntry,
} from "../monthly-cycle-lifecycle";
import type { MonthlyAthleteCycle } from "../monthly-cycle-types";
import { CycleStepActions } from "./cycle-step-actions";
import { StaleStepAlert } from "./stale-step-alert";

const weekBadge = (entry: WeeklyCoverageEntry, today: string) => {
  if (entry.report && entry.counts) {
    return { label: "Recorded", variant: "default" as const };
  }
  if (entry.report) {
    return { label: "Needs details", variant: "destructive" as const };
  }
  if (entry.weekStart > today) {
    return { label: "Upcoming", variant: "secondary" as const };
  }
  return { label: "Not recorded", variant: "destructive" as const };
};

export const WeeklyStep = ({
  context,
  cycle,
  stepView,
}: {
  context: CycleDomainContext;
  cycle: MonthlyAthleteCycle;
  stepView: CycleStepView;
}) => {
  const router = useRouter();
  const { plans } = useTrainingPlans();
  const { createWeekly, getWeekly, updateWeekly } = useReports();
  const coverage = weeklyCoverageFor(
    context.weeklyReports,
    cycle.athleteId,
    cycle.month
  );
  const mondays = expectedMondays(cycle.month);
  const today = new Date().toISOString().slice(0, 10);
  const uncovered = coverage.filter((entry) => !entry.counts).length;
  const [exceptionReason, setExceptionReason] = useState(
    cycle.steps.weekly.reason ?? ""
  );

  const confirm = () => {
    if (uncovered === 0) {
      const result = confirmCycleStep(cycle, "weekly", {
        sources: stepView.currentSources,
        status: "complete",
      });
      return result.status === "saved";
    }
    if (!exceptionReason.trim()) {
      return false;
    }
    const result = confirmCycleStep(cycle, "weekly", {
      reason: exceptionReason.trim(),
      sources: stepView.currentSources,
      status: "exception",
    });
    return result.status === "saved";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">
          Weekly reports
        </h2>
        <p className="text-muted-foreground mt-2">
          Every Monday that begins in {formatDate(`${cycle.month}-01`)} needs a
          report. Completed, competition, medical-leave, and absent entries all
          count when their required details are present.
        </p>
      </div>
      {stepView.status === "stale" ? (
        <StaleStepAlert label="The weekly reports" />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>
            {mondays.length} expected weeks · {mondays.length - uncovered}{" "}
            covered
          </CardTitle>
          <CardDescription>
            Add or edit each week&apos;s entry below. The most recent entry for
            a week is the one that counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion>
            {coverage.map((entry) => (
              <WeekRow
                athleteId={cycle.athleteId}
                equipmentSetups={context.equipmentSetups}
                entry={entry}
                key={entry.weekStart}
                plans={plans}
                reports={{ createWeekly, getWeekly, updateWeekly }}
                today={today}
              />
            ))}
          </Accordion>
        </CardContent>
      </Card>
      {uncovered > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Weekly exception</CardTitle>
            <CardDescription>
              {uncovered} {uncovered === 1 ? "week is" : "weeks are"} not
              covered by a report. Document why before completing this step.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="weekly-exception">
                Exception reason
              </FieldLabel>
              <Textarea
                id="weekly-exception"
                onChange={(event) => setExceptionReason(event.target.value)}
                value={exceptionReason}
              />
            </Field>
          </CardContent>
        </Card>
      ) : null}
      <CycleStepActions
        cycleId={cycle.id}
        onSaveContinue={() => {
          if (confirm()) {
            router.push(`/monthly-cycles/${cycle.id}/monthly-average`);
          }
        }}
        onSaveExit={() => {
          if (confirm()) {
            router.push(`/monthly-cycles?month=${cycle.month}`);
          }
        }}
        saveContinueDisabled={uncovered > 0 && !exceptionReason.trim()}
        step="weekly"
      />
    </div>
  );
};

const WeekRow = ({
  athleteId,
  equipmentSetups,
  entry,
  plans,
  reports,
  today,
}: {
  athleteId: string;
  equipmentSetups: CycleDomainContext["equipmentSetups"];
  entry: WeeklyCoverageEntry;
  plans: ReturnType<typeof useTrainingPlans>["plans"];
  reports: {
    createWeekly: ReturnType<typeof useReports>["createWeekly"];
    getWeekly: ReturnType<typeof useReports>["getWeekly"];
    updateWeekly: ReturnType<typeof useReports>["updateWeekly"];
  };
  today: string;
}) => {
  const badge = weekBadge(entry, today);
  const existing = entry.report;
  const future = entry.weekStart > today;
  const [form, setForm] = useState<WeeklyFormState>(() =>
    existing
      ? weeklyFormStateFromReport(existing)
      : blankWeeklyFormState(athleteId)
  );
  const [errors, setErrors] = useState<ReportFormErrors>({});
  const planWeek = planWeekFor(plans, form.athleteId, form.weekStart);

  const update = <K extends keyof WeeklyFormState>(
    key: K,
    value: WeeklyFormState[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const save = () => {
    const withWeek: WeeklyFormState = {
      ...form,
      athleteId,
      weekStart: entry.weekStart,
    };
    const nextErrors = validateWeeklyForm(withWeek);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }
    const effectiveSetup = setupEffectiveBy(
      equipmentSetups,
      withWeek.weekStart
    );
    const input = weeklyInputFromForm(withWeek, planWeek, effectiveSetup?.id);
    const result = existing
      ? reports.updateWeekly(existing.id, input)
      : reports.createWeekly(input);
    if (result.status === "saved") {
      setErrors({});
    } else {
      setErrors(result.fieldErrors);
    }
  };

  return (
    <AccordionItem value={entry.weekStart}>
      <AccordionTrigger>
        <span className="flex items-center gap-3">
          <span className="font-medium">{formatDate(entry.weekStart)}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        {future ? (
          <p className="text-muted-foreground text-sm">
            This week has not started yet, so no entry can be recorded.
          </p>
        ) : (
          <form
            className="space-y-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            {Object.keys(errors).length > 0 ? (
              <div
                className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4"
                role="alert"
              >
                <p className="font-medium">Check the entry before saving.</p>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {Object.values(errors).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <WeeklyReportFields
              errors={errors}
              form={form}
              planWeek={planWeek}
              update={update}
            />
            <div className="flex justify-end gap-2">
              <Button type="submit">
                <PlusIcon aria-hidden />{" "}
                {existing ? "Update entry" : "Record entry"}
              </Button>
            </div>
          </form>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};
