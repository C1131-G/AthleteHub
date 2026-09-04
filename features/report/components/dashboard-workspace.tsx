"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { categoryLabel, statusLabel } from "@/features/athlete/athlete-labels";
import { useAthletes } from "@/features/athlete/use-athletes";
import { useConditioning } from "@/features/conditioning/use-conditioning";
import { useEquipment } from "@/features/equipment/use-equipment";
import { useTrainingPlans } from "@/features/training-plan/use-training-plans";

import { dashboardMetrics } from "../dashboard-metrics";
import { useReports } from "../use-reports";
import { DashboardFilters } from "./dashboard-filters";
import { DashboardWorkspaceSkeleton, Metric } from "./dashboard-parts";
import { ArrowLoadChart, ScoreTrendChart } from "./report-chart";
import {
  AthleteRankingChart,
  ReportCompletionChart,
} from "./report-ranking-charts";

export { DashboardWorkspaceSkeleton } from "./dashboard-parts";

const DASHBOARD_PATH = "/dashboard";

export const DashboardWorkspace = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const month = searchParams.get("month") ?? "";
  const athleteFilter = searchParams.get("athleteId") ?? "";
  const categoryFilter = searchParams.get("category") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const { athletes, ready: athletesReady } = useAthletes();
  const { listMonthly, listWeekly, ready: reportsReady } = useReports();
  const { listByAthlete, ready: equipmentReady } = useEquipment();
  const { plans, ready: plansReady } = useTrainingPlans();
  const conditioning = useConditioning();
  const rankingDistance = Number(searchParams.get("distance") ?? "70") || 70;
  const {
    attentionRows,
    averageScoreChange,
    completionPoints,
    load,
    loadPoints,
    monthMonthly,
    monthWeekly,
    openRequirements,
    rankingPoints,
    scopedAthletes,
    scoreSeries,
    statusCounts,
  } = dashboardMetrics({
    athletes,
    conditioningAssessments: conditioning.assessments,
    conditioningProgrammes: conditioning.programmes,
    equipmentFor: listByAthlete,
    filters: {
      athleteId: athleteFilter,
      category: categoryFilter,
      month,
      rankingDistance,
      status: statusFilter,
    },
    monthly: listMonthly,
    plans,
    weekly: listWeekly,
  });

  if (
    !(
      athletesReady &&
      conditioning.ready &&
      equipmentReady &&
      plansReady &&
      reportsReady
    )
  ) {
    return <DashboardWorkspaceSkeleton />;
  }
  const updateFilter = (param: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(param, value);
    } else {
      next.delete(param);
    }
    router.replace(`${DASHBOARD_PATH}?${next.toString()}`);
  };
  return (
    <section className="space-y-6" aria-labelledby="dashboard-title">
      <DashboardFilters
        athleteFilter={athleteFilter}
        athletes={athletes}
        categoryFilter={categoryFilter}
        month={month}
        onMonthChange={(value) => updateFilter("month", value)}
        statusFilter={statusFilter}
        updateFilter={updateFilter}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          title="Active athletes"
          value={String(
            scopedAthletes.filter((athlete) => athlete.status === "active")
              .length
          )}
        />
        <Metric
          title="Weekly entries submitted"
          value={String(monthWeekly.length)}
        />
        <Metric
          title="Monthly complete"
          value={`${statusCounts.complete}/${scopedAthletes.length}`}
        />
        <Metric
          title="Average score change"
          value={averageScoreChange.toFixed(1)}
        />
        <Metric
          title="Planned vs shot arrows"
          value={`${load.shot}/${load.planned}`}
          progress={load.completion}
        />
        <Metric
          title="Open equipment requirements"
          value={String(openRequirements)}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ScoreTrendChart month={month} series={scoreSeries} />
        <ArrowLoadChart points={loadPoints} />
        <AthleteRankingChart
          points={rankingPoints}
          distanceM={rankingDistance}
        />
        <ReportCompletionChart points={completionPoints} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Report completion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Complete {statusCounts.complete}</Badge>
            <Badge variant="secondary">Draft {statusCounts.draft}</Badge>
            <Badge variant="outline">Missing {statusCounts.missing}</Badge>
          </div>
          <div className="grid gap-3">
            {scopedAthletes.map((athlete) => {
              const report = monthMonthly.find(
                (item) => item.athleteId === athlete.id
              );
              return (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0"
                  key={athlete.id}
                >
                  <div>
                    <p className="font-medium">{athlete.fullName}</p>
                    <p className="text-muted-foreground text-xs">
                      {categoryLabel[athlete.category]} ·{" "}
                      {statusLabel[athlete.status]}
                    </p>
                  </div>
                  {report ? (
                    <Link
                      className="underline underline-offset-4"
                      href={`/reports/monthly/${report.id}`}
                    >
                      {report.status === "complete"
                        ? "View complete report"
                        : "Finish draft"}
                    </Link>
                  ) : (
                    <Link
                      className="underline underline-offset-4"
                      href={`/reports/monthly/new?athleteId=${athlete.id}&month=${month}`}
                    >
                      Create report
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
        </CardHeader>
        <CardContent>
          {attentionRows.length ? (
            <div className="overflow-x-auto">
              <Table>
                <caption className="sr-only">
                  Items requiring coaching attention
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Athlete</TableHead>
                    <TableHead scope="col">Reason</TableHead>
                    <TableHead scope="col">
                      <span className="sr-only">Action</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attentionRows.map((row) => (
                    <TableRow key={`${row.athlete}-${row.reason}`}>
                      <TableCell>{row.athlete}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.reason}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          className="underline underline-offset-4"
                          // SAFETY: attention links are built from known internal route templates.
                          href={row.href}
                        >
                          Review
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No attention items for this month.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
};
