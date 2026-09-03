"use client";

import { ArrowLeftIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAthletes } from "@/features/athlete/use-athletes";
import { useReports } from "@/features/report/use-reports";

import {
  currentTechnicalFocus,
  planTotals,
  planWeekProgress,
} from "../training-plan-calculations";
import {
  formatArrows,
  formatVariance,
  seasonRange,
  seasonTargetLabel,
} from "../training-plan-format";
import {
  trainingPlanEditHref,
  trainingPlansHref,
} from "../training-plan-routes";
import { useTrainingPlans } from "../use-training-plans";
import {
  PlannedVersusActualChart,
  WeeklyTargetChart,
} from "./training-plan-chart";
import { TrainingPlanEvents } from "./training-plan-events";
import {
  PlanNotFound,
  PlanStatusBadge,
  TrainingPlanSkeleton,
} from "./training-plan-parts";
import { TrainingPlanProgressTable } from "./training-plan-progress-table";

const today = () => new Date().toISOString().slice(0, 10);

export const TrainingPlanPreview = ({ planId }: { planId: string }) => {
  const { athletes, ready: athletesReady } = useAthletes();
  const { listWeekly, ready: reportsReady } = useReports();
  const { getPlan, ready: plansReady } = useTrainingPlans();
  const plan = getPlan(planId);
  const progress = useMemo(
    () => (plan ? planWeekProgress(plan, listWeekly) : []),
    [listWeekly, plan]
  );
  const totals = useMemo(() => planTotals(progress), [progress]);

  if (!(athletesReady && plansReady && reportsReady)) {
    return <TrainingPlanSkeleton />;
  }
  if (!plan) {
    return <PlanNotFound />;
  }
  const athlete = athletes.find((item) => item.id === plan.athleteId);
  const seasonTarget = seasonTargetLabel(plan);

  return (
    <article className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-muted-foreground text-sm">
            {athlete?.fullName ?? "Unknown athlete"}
            {athlete ? ` · ${athlete.athleteId}` : ""}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">
            {plan.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {seasonRange(plan)}
          </p>
          <div className="mt-3">
            <PlanStatusBadge status={plan.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={trainingPlansHref()}
          >
            <ArrowLeftIcon /> Back to plans
          </Link>
          <Link
            className={buttonVariants()}
            href={trainingPlanEditHref(plan.id)}
          >
            <PencilSimpleIcon /> Edit plan
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard label="Season target" value={seasonTarget} />
        <OverviewCard
          hint={`${plan.weeks.length} planned weeks`}
          label="Planned arrows"
          value={formatArrows(totals.plannedArrows)}
        />
        <OverviewCard
          hint={
            totals.missingWeeks
              ? `${totals.missingWeeks} weeks without a report`
              : "Every planned week reported"
          }
          label="Actual arrows"
          value={formatArrows(totals.actualArrows)}
        />
        <Card>
          <CardContent className="pt-6">
            <Progress value={Math.min(100, Math.round(totals.completion))}>
              <ProgressLabel>Completion</ProgressLabel>
              <ProgressValue />
            </Progress>
            <p className="text-muted-foreground mt-3 text-xs">
              Variance {formatVariance(totals.variance)} arrows across{" "}
              {totals.recordedWeeks} reported weeks
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="progression">
        <TabsList aria-label="Training plan sections">
          <TabsTrigger value="progression">
            Weekly progression ({progress.length})
          </TabsTrigger>
          <TabsTrigger value="events">
            Events ({plan.events.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent className="space-y-6" value="progression">
          <div className="grid gap-6 lg:grid-cols-2">
            <PlannedVersusActualChart progress={progress} />
            <WeeklyTargetChart progress={progress} />
          </div>
          <TrainingPlanProgressTable progress={progress} />
        </TabsContent>
        <TabsContent value="events">
          <TrainingPlanEvents plan={plan} />
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Coach strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">
              {plan.strategyNotes || "No strategy recorded for this season."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current technical focus</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">
              {currentTechnicalFocus(plan, today()) ||
                "No technical focus set for the current week."}
            </p>
          </CardContent>
        </Card>
      </div>
    </article>
  );
};

const OverviewCard = ({
  hint,
  label,
  value,
}: {
  hint?: string;
  label: string;
  value: string;
}) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? (
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      ) : null}
    </CardContent>
  </Card>
);

export const TrainingPlanPreviewSkeleton = () => <TrainingPlanSkeleton />;
