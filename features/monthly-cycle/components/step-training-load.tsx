"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { monthLabel, nextMonthOf } from "@/features/report/report-calculations";
import type {
  SeasonTrainingPlan,
  SeasonTrainingPlanInput,
  TrainingPlanWeek,
} from "@/features/training-plan/training-plan-types";
import { useTrainingPlans } from "@/features/training-plan/use-training-plans";
import { formatDate } from "@/lib/format";

import { confirmCycleStep } from "../cycle-step-actions";
import type {
  CycleDomainContext,
  CycleStepView,
} from "../monthly-cycle-lifecycle";
import {
  coveringPlanForNextMonth,
  expectedMondays,
} from "../monthly-cycle-lifecycle";
import type { MonthlyAthleteCycle } from "../monthly-cycle-types";
import { useCycleGuard } from "./cycle-guard";
import { CycleStepActions } from "./cycle-step-actions";
import { StaleStepAlert } from "./stale-step-alert";

export const TrainingLoadStep = ({
  context,
  cycle,
  stepView,
}: {
  context: CycleDomainContext;
  cycle: MonthlyAthleteCycle;
  stepView: CycleStepView;
}) => {
  const router = useRouter();
  const { createPlan, updatePlan } = useTrainingPlans();
  const { setDirty } = useCycleGuard();
  const plan = coveringPlanForNextMonth(
    context.plans,
    cycle.athleteId,
    cycle.month
  );
  const nextMonth = nextMonthOf(cycle.month);
  const [editingWeeks, setEditingWeeks] = useState<TrainingPlanWeek[]>([]);
  const [exceptionReason, setExceptionReason] = useState(
    cycle.steps["training-load"].reason ?? ""
  );
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newArrows, setNewArrows] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const updateWeek = (weekId: string, arrows: number, days: number) => {
    setDirty(true);
    setEditingWeeks((current) =>
      current.map((week) =>
        week.id === weekId
          ? { ...week, arrowsPlanned: arrows, trainingDaysPlanned: days }
          : week
      )
    );
  };

  const savePlanEdits = (source: SeasonTrainingPlan): boolean => {
    const weeks = source.weeks.map((week) => {
      const edited = editingWeeks.find((entry) => entry.id === week.id);
      return edited ?? week;
    });
    const input: SeasonTrainingPlanInput = {
      athleteId: source.athleteId,
      endsOn: source.endsOn,
      events: source.events,
      name: source.name,
      startsOn: source.startsOn,
      status: source.status,
      strategyNotes: source.strategyNotes,
      targetDistanceM: source.targetDistanceM,
      targetScore: source.targetScore,
      weeks,
    };
    const result = updatePlan(source.id, input);
    if (result.status !== "saved") {
      setFormError(
        Object.values(result.fieldErrors)[0] ?? "Could not save the plan."
      );
      return false;
    }
    const confirmed = confirmCycleStep(cycle, "training-load", {
      sources: [{ id: result.plan.id, updatedAt: result.plan.updatedAt }],
      status: "complete",
    });
    if (confirmed.status !== "saved") {
      setFormError("Could not save the cycle confirmation on this device.");
      return false;
    }
    setDirty(false);
    return true;
  };

  const createQuickPlan = (): boolean => {
    if (!nextMonth) {
      return false;
    }
    if (!newName.trim()) {
      setFormError("Name the training load plan.");
      return false;
    }
    const mondays = expectedMondays(nextMonth);
    const weeks: TrainingPlanWeek[] = mondays.map((weekStart) => {
      const enteredArrows = Number(newArrows[weekStart] ?? "600");
      return {
        arrowsPlanned:
          Number.isFinite(enteredArrows) && enteredArrows >= 0
            ? enteredArrows
            : 600,
        id: `w-${weekStart}`,
        technicalFocus: "",
        trainingDaysPlanned: 6,
        weekStart,
      };
    });
    const input: SeasonTrainingPlanInput = {
      athleteId: cycle.athleteId,
      endsOn: lastDayOfMonth(nextMonth),
      events: [],
      name: newName.trim(),
      startsOn: mondays[0] ?? `${nextMonth}-01`,
      status: "draft",
      strategyNotes: newNotes,
      weeks,
    };
    const result = createPlan(input);
    if (result.status !== "saved") {
      setFormError(
        Object.values(result.fieldErrors)[0] ?? "Could not create the plan."
      );
      return false;
    }
    const confirmed = confirmCycleStep(cycle, "training-load", {
      sources: [{ id: result.plan.id, updatedAt: result.plan.updatedAt }],
      status: "complete",
    });
    if (confirmed.status !== "saved") {
      setFormError("Could not save the cycle confirmation on this device.");
      return false;
    }
    setDirty(false);
    return true;
  };

  const confirmException = (): boolean => {
    if (!exceptionReason.trim()) {
      setFormError("Describe the planning exception before continuing.");
      return false;
    }
    confirmCycleStep(cycle, "training-load", {
      reason: exceptionReason.trim(),
      sources: plan ? [{ id: plan.id, updatedAt: plan.updatedAt }] : [],
      status: "exception",
    });
    setDirty(false);
    return true;
  };

  const nextMonthWeeks = plan
    ? plan.weeks
        .filter((week) => week.weekStart.startsWith(nextMonth))
        .toSorted((a, b) => a.weekStart.localeCompare(b.weekStart))
    : [];

  const startEditing = () => {
    setEditingWeeks(nextMonthWeeks.map((week) => ({ ...week })));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mt-2">
          The following month needs a season plan that covers it, or a
          documented planning exception.
        </p>
      </div>
      {stepView.status === "stale" ? (
        <StaleStepAlert label="The training plan" />
      ) : null}
      {formError ? (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4"
          role="alert"
        >
          {formError}
        </div>
      ) : null}
      {plan ? (
        <Card>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>
              {formatDate(plan.startsOn)} – {formatDate(plan.endsOn)} ·{" "}
              {plan.status} plan. Weeks shown cover {monthLabel(nextMonth)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextMonthWeeks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Week start</TableHead>
                    <TableHead scope="col">Arrows planned</TableHead>
                    <TableHead scope="col">Training days</TableHead>
                    <TableHead scope="col">Technical focus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nextMonthWeeks.map((week) => {
                    const edited = editingWeeks.find(
                      (entry) => entry.id === week.id
                    );
                    return (
                      <TableRow key={week.id}>
                        <TableCell>{formatDate(week.weekStart)}</TableCell>
                        <TableCell>
                          {edited ? (
                            <Input
                              aria-label={`Arrows planned for ${formatDate(week.weekStart)}`}
                              className="w-28"
                              onChange={(event) =>
                                updateWeek(
                                  week.id,
                                  Math.max(0, Number(event.target.value) || 0),
                                  edited.trainingDaysPlanned
                                )
                              }
                              type="number"
                              value={String(edited.arrowsPlanned)}
                            />
                          ) : (
                            week.arrowsPlanned
                          )}
                        </TableCell>
                        <TableCell>
                          {edited ? (
                            <Input
                              aria-label={`Training days for ${formatDate(week.weekStart)}`}
                              className="w-20"
                              max={7}
                              min={1}
                              onChange={(event) =>
                                updateWeek(
                                  week.id,
                                  edited.arrowsPlanned,
                                  Math.min(
                                    7,
                                    Math.max(1, Number(event.target.value) || 1)
                                  )
                                )
                              }
                              type="number"
                              value={String(edited.trainingDaysPlanned)}
                            />
                          ) : (
                            week.trainingDaysPlanned
                          )}
                        </TableCell>
                        <TableCell>{week.technicalFocus || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm">
                This plan does not schedule any weeks in {monthLabel(nextMonth)}
                . Record a planning exception or create a plan that covers it.
              </p>
            )}
            <Button
              disabled={editingWeeks.length > 0}
              onClick={startEditing}
              type="button"
              variant="outline"
            >
              Edit {monthLabel(nextMonth)} weeks
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No covering plan for {monthLabel(nextMonth)}</CardTitle>
            <CardDescription>
              Create a plan for the following month, or document why planning is
              not possible yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="training-plan-name">Plan name</FieldLabel>
              <Input
                id="training-plan-name"
                onChange={(event) => {
                  setNewName(event.target.value);
                  setDirty(true);
                }}
                value={newName}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="training-plan-notes">
                Strategy notes
              </FieldLabel>
              <Textarea
                id="training-plan-notes"
                onChange={(event) => {
                  setNewNotes(event.target.value);
                  setDirty(true);
                }}
                value={newNotes}
              />
            </Field>
            <Field>
              <FieldLabel>Arrows per week</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {expectedMondays(nextMonth).map((weekStart) => (
                  <Input
                    aria-label={`Arrows planned for ${formatDate(weekStart)}`}
                    className="w-32"
                    key={weekStart}
                    onChange={(event) => {
                      setNewArrows((current) => ({
                        ...current,
                        [weekStart]: event.target.value,
                      }));
                      setDirty(true);
                    }}
                    placeholder={formatDate(weekStart)}
                    type="number"
                    value={newArrows[weekStart] ?? "600"}
                  />
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Planning exception</CardTitle>
          <CardDescription>
            Use only when a plan genuinely cannot be set yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="training-load-exception">Reason</FieldLabel>
            <Textarea
              id="training-load-exception"
              onChange={(event) => {
                setExceptionReason(event.target.value);
                setDirty(true);
              }}
              value={exceptionReason}
            />
          </Field>
        </CardContent>
      </Card>
      <CycleStepActions
        cycleId={cycle.id}
        onSaveContinue={() => {
          if (plan) {
            if (savePlanEdits(plan)) {
              router.push(`/monthly-cycles/${cycle.id}/conditioning`);
            }
            return;
          }
          if (newName.trim() && !exceptionReason.trim()) {
            if (createQuickPlan()) {
              router.push(`/monthly-cycles/${cycle.id}/conditioning`);
            }
            return;
          }
          if (confirmException()) {
            router.push(`/monthly-cycles/${cycle.id}/conditioning`);
          }
        }}
        onSaveExit={() => {
          if (plan && savePlanEdits(plan)) {
            router.push(`/monthly-cycles?month=${cycle.month}`);
            return;
          }
          if (!plan && newName.trim() && createQuickPlan()) {
            router.push(`/monthly-cycles?month=${cycle.month}`);
            return;
          }
          if (!plan && confirmException()) {
            router.push(`/monthly-cycles?month=${cycle.month}`);
          }
        }}
        saveContinueDisabled={Boolean(
          !plan && !newName.trim() && !exceptionReason.trim()
        )}
        step="training-load"
      />
    </div>
  );
};

/** Last calendar day of `yyyy-MM`, tolerating short months. */
const lastDayOfMonth = (month: string) => {
  const [year, mon] = month.split("-").map(Number);
  const last = new Date(year ?? 1970, mon ?? 1, 0).getDate();
  return `${month}-${String(last).padStart(2, "0")}`;
};
