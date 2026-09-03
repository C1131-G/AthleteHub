"use client";

import { PrinterIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { useAthletes } from "@/features/athlete/use-athletes";
import {
  createMonthlyDraft,
  monthLabel,
  nextMonthOf,
} from "@/features/report/report-calculations";
import { useReports } from "@/features/report/use-reports";
import { weeklyArrowTargetsForMonth } from "@/features/training-plan/training-plan-calculations";
import { formatDate } from "@/lib/format";

import { confirmCycleStep } from "../cycle-step-actions";
import {
  conditioningCoverageFor,
  coveringPlanForNextMonth,
  deriveCycleView,
  monthlyAverageFor,
  monthEndDate,
  nextIncompleteAthlete,
  setupEffectiveBy,
  weeklyCoverageFor,
} from "../monthly-cycle-lifecycle";
import type { CycleDomainContext } from "../monthly-cycle-lifecycle";
import { monthlyCycleRepository } from "../monthly-cycle-repository";
import { monthlyCycleStepMeta } from "../monthly-cycle-steps";
import { blankCycleSteps } from "../monthly-cycle-types";
import type { MonthlyAthleteCycle } from "../monthly-cycle-types";
import { useMonthlyCycles } from "../use-monthly-cycles";
import { useCycleGuard } from "./cycle-guard";
import { CycleStepActions } from "./cycle-step-actions";

const stepBadgeVariant = (
  status: "pending" | "complete" | "exception" | "stale"
): "default" | "secondary" | "destructive" => {
  if (status === "complete") {
    return "default";
  }
  return status === "pending" ? "secondary" : "destructive";
};

const equipmentSummary = (
  equipment: MonthlyAthleteCycle["steps"]["equipment"],
  setup: ReturnType<typeof setupEffectiveBy>
) => {
  if (equipment.status === "exception") {
    return equipment.reason || "No equipment change";
  }
  return setup
    ? `Setup recorded ${formatDate(setup.recordedAt)}`
    : "No setup on record by month end";
};

const stepSummaryLabels = {
  complete: "Confirmed",
  exception: "Exception recorded",
  pending: "Not done",
  stale: "Needs reconfirmation",
} as const;

export const ReviewStep = ({
  context,
  cycle,
}: {
  context: CycleDomainContext;
  cycle: MonthlyAthleteCycle;
}) => {
  const router = useRouter();
  const { setDirty } = useCycleGuard();
  const { athletes } = useAthletes();
  const { createCycle } = useMonthlyCycles();
  const { createMonthly, updateMonthly } = useReports();
  const view = deriveCycleView(cycle, context);
  const blockers: string[] = [];
  for (const meta of monthlyCycleStepMeta.slice(0, 6)) {
    const { status } = view.steps[meta.step];
    if (status === "pending" || status === "stale") {
      blockers.push(meta.label);
    }
  }
  const coverage = weeklyCoverageFor(
    context.weeklyReports,
    cycle.athleteId,
    cycle.month
  );
  const averages = monthlyAverageFor(
    context.weeklyReports,
    cycle.athleteId,
    cycle.month
  );
  const effectiveSetup = setupEffectiveBy(
    context.equipmentSetups,
    monthEndDate(cycle.month)
  );
  const conditioning = conditioningCoverageFor(
    context.assessments,
    context.programmes,
    cycle.athleteId,
    cycle.month
  );
  const existingReport = context.monthlyReport;
  const [coachSummary, setCoachSummary] = useState(
    existingReport?.coachSummary ?? ""
  );

  const complete = () => {
    const draft = createMonthlyDraft(
      cycle.athleteId,
      cycle.month,
      existingReport
    );
    const plan = coveringPlanForNextMonth(
      context.plans,
      cycle.athleteId,
      cycle.month
    );
    const nextMonth = nextMonthOf(cycle.month);
    const targets = plan ? weeklyArrowTargetsForMonth(plan, nextMonth) : [];
    const input = {
      ...draft,
      coachSummary,
      nextMonthPlan: {
        ...draft.nextMonthPlan,
        notes: plan ? `Derived from ${plan.name}.` : draft.nextMonthPlan.notes,
        targetDistanceM: plan?.targetDistanceM,
        targetScore: plan?.targetScore,
        weeklyArrowTargets: targets,
      },
      sourceReferences: {
        conditioningAssessmentId: conditioning.assessment?.id,
        conditioningProgrammeId: conditioning.programme?.id,
        cycleId: cycle.id,
        equipmentSetupId: effectiveSetup?.id,
        trainingPlanId: plan?.id,
        weeklyReportIds: coverage.flatMap((entry) =>
          entry.counts && entry.report?.id ? [entry.report.id] : []
        ),
      },
      status: "complete" as const,
    };
    const result = existingReport
      ? updateMonthly(existingReport.id, input)
      : createMonthly(input);
    if (result.status !== "saved") {
      return;
    }
    const confirmed = confirmCycleStep(cycle, "review", {
      sources: [{ id: result.report.id, updatedAt: result.report.updatedAt }],
      status: "complete",
    });
    if (confirmed.status !== "saved") {
      return;
    }
    setDirty(false);
    // The store commits synchronously; read the repository for the
    // post-completion list before choosing who is next.
    const cycles = monthlyCycleRepository.list();
    const next = nextIncompleteAthlete(athletes, cycles, cycle.month, cycle.id);
    if (!next) {
      router.push(
        `/monthly-cycles?month=${encodeURIComponent(cycle.month)}&summary=month-complete`
      );
      return;
    }
    const existingNextCycleId = cycles.find(
      (entry) =>
        entry.athleteId.toLowerCase() === next.id.toLowerCase() &&
        entry.month === cycle.month
    )?.id;
    let nextCycleId = existingNextCycleId;
    if (!nextCycleId) {
      const created = createCycle({
        athleteId: next.id,
        lastVisitedStep: "profile",
        month: cycle.month,
        status: "not-started",
        steps: blankCycleSteps(),
      });
      if (created.status === "saved") {
        nextCycleId = created.cycle.id;
      }
    }
    if (!nextCycleId) {
      router.push(`/monthly-cycles?month=${cycle.month}`);
      return;
    }
    router.push(`/monthly-cycles/${nextCycleId}/profile`);
  };

  const saveAndExit = () => {
    const draft = createMonthlyDraft(
      cycle.athleteId,
      cycle.month,
      existingReport
    );
    const result = existingReport
      ? updateMonthly(existingReport.id, {
          ...draft,
          coachSummary: coachSummary.trim(),
          status: existingReport.status,
        })
      : createMonthly({
          ...draft,
          coachSummary: coachSummary.trim(),
          status: "draft",
        });
    if (result.status !== "saved") {
      return;
    }
    setDirty(false);
    router.push(`/monthly-cycles?month=${cycle.month}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground mt-2">
            One consolidated view of the whole month. Completing this step saves
            the monthly report as complete and opens the next athlete.
          </p>
        </div>
        <Button onClick={() => window.print()} type="button" variant="ghost">
          <PrinterIcon aria-hidden /> Print
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Step status</CardTitle>
          <CardDescription>
            Every step must be confirmed or excepted before the cycle can be
            completed. Draft reports cannot complete a cycle — this step saves
            the monthly report as complete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {monthlyCycleStepMeta.map((meta) => (
              <li
                className="flex items-center justify-between gap-3"
                key={meta.step}
              >
                <span>{meta.label}</span>
                <Badge variant={stepBadgeVariant(view.steps[meta.step].status)}>
                  {stepSummaryLabels[view.steps[meta.step].status]}
                </Badge>
              </li>
            ))}
          </ul>
          {blockers.length > 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              Still open: {blockers.join(", ")}.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Month summary — {monthLabel(cycle.month)}</CardTitle>
          <CardDescription>
            {context.athlete?.fullName} · {context.athlete?.athleteId}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-sm">Equipment</dt>
              <dd className="font-medium">
                {equipmentSummary(cycle.steps.equipment, effectiveSetup)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Weekly reports</dt>
              <dd className="font-medium">
                {coverage.filter((entry) => entry.counts).length} of{" "}
                {coverage.length} weeks covered
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Average score</dt>
              <dd className="font-medium">
                {averages.scoring.length
                  ? averages.scoring
                      .map(
                        (entry) =>
                          `${entry.average.toFixed(1)} @ ${entry.distanceM} m`
                      )
                      .join(", ")
                  : "No scoring data"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Arrow load</dt>
              <dd className="font-medium">
                {averages.load.shot} / {averages.load.planned} arrows (
                {averages.load.completion.toFixed(0)}%)
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Conditioning</dt>
              <dd className="font-medium">
                {conditioning.assessment
                  ? `Assessed ${formatDate(conditioning.assessment.assessedOn)}`
                  : "No assessment this month"}
                {conditioning.programme
                  ? ` · programme ${formatDate(conditioning.programme.startsOn)} – ${formatDate(conditioning.programme.endsOn)}`
                  : " · no covering programme"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-sm">Monthly report</dt>
              <dd className="font-medium">
                {existingReport ? (
                  <>
                    <Badge
                      variant={
                        existingReport.status === "complete"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {existingReport.status}
                    </Badge>{" "}
                    saved for this month
                  </>
                ) : (
                  "Created by completing this step"
                )}
              </dd>
            </div>
          </dl>
          <Field>
            <FieldLabel htmlFor="review-summary">
              Coach summary (saved onto the monthly report)
            </FieldLabel>
            <Textarea
              id="review-summary"
              onChange={(event) => {
                setCoachSummary(event.target.value);
                setDirty(true);
              }}
              value={coachSummary}
            />
          </Field>
        </CardContent>
      </Card>
      <CycleStepActions
        cycleId={cycle.id}
        saveContinueDisabled={blockers.length > 0}
        saveContinueLabel="Complete monthly cycle"
        onSaveContinue={complete}
        onSaveExit={saveAndExit}
        step="review"
      />
    </div>
  );
};
