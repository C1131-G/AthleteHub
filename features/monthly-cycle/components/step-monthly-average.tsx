"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartCard,
  ChartLegend,
  DataTable,
} from "@/features/report/chart-parts";
import type { LoadPoint } from "@/features/report/dashboard-load";
import {
  ArrowLoadChart,
  ScoreTrendChart,
} from "@/features/report/report-chart";
import { formatDate } from "@/lib/format";

import { useConfirmCycleStep } from "../cycle-step-actions";
import {
  monthlyAverageFor,
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

const averageOf = (scores: number[]) =>
  scores.length
    ? scores.reduce((total, score) => total + score, 0) / scores.length
    : 0;

export const MonthlyAverageStep = ({
  context,
  cycle,
  stepView,
}: {
  context: CycleDomainContext;
  cycle: MonthlyAthleteCycle;
  stepView: CycleStepView;
}) => {
  const router = useRouter();
  const confirmCycleStep = useConfirmCycleStep();
  const [confirmed, setConfirmed] = useState(
    cycle.steps["monthly-average"].status === "complete"
  );
  const coverage = weeklyCoverageFor(
    context.weeklyReports,
    cycle.athleteId,
    cycle.month
  );
  const summary = monthlyAverageFor(
    context.weeklyReports,
    cycle.athleteId,
    cycle.month
  );

  const series = useMemo(() => {
    const grouped = new Map<number, { label: string; value: number }[]>();
    for (const entry of coverage) {
      const { report } = entry;
      if (!report?.distanceM || !entry.counts || report.scores.length === 0) {
        continue;
      }
      const points = grouped.get(report.distanceM) ?? [];
      points.push({
        label: report.weekStart.slice(5),
        value: averageOf(report.scores),
      });
      grouped.set(report.distanceM, points);
    }
    return [...grouped.entries()]
      .toSorted((a, b) => a[0] - b[0])
      .map(([distanceM, points]) => ({ distanceM, points }));
  }, [coverage]);

  const loadPoints: LoadPoint[] = useMemo(
    () =>
      coverage
        .filter(
          (
            entry
          ): entry is WeeklyCoverageEntry & {
            report: NonNullable<WeeklyCoverageEntry["report"]>;
          } => Boolean(entry.report)
        )
        .map((entry) => ({
          label: entry.report.weekStart.slice(5),
          planned: entry.report.arrowsPlanned ?? 0,
          shot: entry.report.arrowsShot,
          weekStart: entry.report.weekStart,
        })),
    [coverage]
  );

  const noScoring =
    summary.scoring.length === 0 &&
    coverage.some(
      (entry) =>
        entry.report?.status === "medical-leave" ||
        entry.report?.status === "absent"
    );

  const confirm = async () => {
    const result = await confirmCycleStep(cycle, "monthly-average", {
      reason: noScoring
        ? "No scoring data this month (leave or absence)."
        : undefined,
      sources: stepView.currentSources,
      status: "complete",
    });
    if (result.status === "saved") {
      setConfirmed(true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mt-2">
          Derived directly from the weekly reports — nothing is stored here, so
          corrections to a week flow straight through.
        </p>
      </div>
      {stepView.status === "stale" ? (
        <StaleStepAlert label="The weekly reports behind the average" />
      ) : null}
      {noScoring ? (
        <Alert>
          <AlertTitle>No scoring data</AlertTitle>
          <AlertDescription>
            No scores were recorded this month because of leave or absence.
            Confirm the empty average to continue; load and attendance still
            show what was planned and completed.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Scoring by distance</CardTitle>
          <CardDescription>
            Totals and averages across all recorded rounds in{" "}
            {formatDate(`${cycle.month}-01`)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {summary.scoring.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Distance</TableHead>
                    <TableHead scope="col">Arrows (rounds)</TableHead>
                    <TableHead scope="col">Total</TableHead>
                    <TableHead scope="col">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.scoring.map((entry) => (
                    <TableRow key={entry.distanceM}>
                      <TableCell>{entry.distanceM} m</TableCell>
                      <TableCell>{entry.rounds}</TableCell>
                      <TableCell>{entry.total}</TableCell>
                      <TableCell>{entry.average.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-2">
                <ChartCard
                  label={`Average score trend for ${formatDate(`${cycle.month}-01`)}`}
                  title="Score trend by week"
                >
                  <ScoreTrendChart month={cycle.month} series={series} />
                  <ChartLegend
                    series={series.map((entry, index) => ({
                      color: `var(--chart-${(index % 5) + 1})`,
                      label: `${entry.distanceM} m`,
                    }))}
                  />
                  <DataTable
                    headers={["Week", "Distance", "Average score (points)"]}
                    rows={series.flatMap((entry) =>
                      entry.points.map((point) => [
                        point.label,
                        `${entry.distanceM} m`,
                        point.value.toFixed(1),
                      ])
                    )}
                  />
                </ChartCard>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              No scoring data was recorded this month.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Arrow load and attendance</CardTitle>
          <CardDescription>
            Planned versus shot arrows, and training days attended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Planned arrows</TableHead>
                <TableHead scope="col">Shot arrows</TableHead>
                <TableHead scope="col">Load completion</TableHead>
                <TableHead scope="col">Attendance days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{summary.load.planned}</TableCell>
                <TableCell>{summary.load.shot}</TableCell>
                <TableCell>{summary.load.completion.toFixed(0)}%</TableCell>
                <TableCell>{summary.attendanceDays}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {loadPoints.length > 0 ? (
            <ChartCard
              label={`Arrow load for ${formatDate(`${cycle.month}-01`)}`}
              title="Arrow load by week"
            >
              <ArrowLoadChart points={loadPoints} />
              <DataTable
                headers={["Week", "Planned (arrows)", "Shot (arrows)"]}
                rows={loadPoints.map((point) => [
                  point.label,
                  String(point.planned),
                  point.shot === undefined
                    ? "Not recorded"
                    : String(point.shot),
                ])}
              />
            </ChartCard>
          ) : null}
        </CardContent>
      </Card>
      {confirmed ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <CheckCircleIcon aria-hidden className="text-primary size-4" />{" "}
          Average confirmed.
        </p>
      ) : (
        <Button onClick={confirm} type="button" variant="outline">
          <CheckCircleIcon aria-hidden /> Confirm monthly average
        </Button>
      )}
      <CycleStepActions
        cycleId={cycle.id}
        onSaveContinue={() => {
          confirm();
          router.push(`/monthly-cycles/${cycle.id}/training-load`);
        }}
        onSaveExit={() => {
          confirm();
          router.push("/monthly-cycles");
        }}
        step="monthly-average"
      />
    </div>
  );
};
