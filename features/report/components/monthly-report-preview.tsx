"use client";

import { ChartLineUpIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAthletes } from "@/features/athlete/use-athletes";

import {
  loadSummary,
  monthLabel,
  reportsForAthleteMonth,
  scoreSummary,
} from "../report-calculations";
import { useReports } from "../use-reports";

export const MonthlyReportPreview = ({ reportId }: { reportId: string }) => {
  const { athletes, ready: athletesReady } = useAthletes();
  const { getMonthly, listWeekly, ready: reportsReady } = useReports();
  const report = getMonthly(reportId);
  const athlete = athletes.find((item) => item.id === report?.athleteId);
  if (!athletesReady || !reportsReady) {
    return <MonthlyReportPreviewSkeleton />;
  }
  if (!report || !athlete) {
    return <EmptyReport />;
  }
  const weeklyReports = reportsForAthleteMonth(
    listWeekly,
    athlete.id,
    report.month
  );
  const scores = scoreSummary(weeklyReports, report.month);
  const load = loadSummary(weeklyReports, report.month);
  return (
    <article className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-muted-foreground text-sm">
            {athlete.fullName} · {athlete.athleteId}
          </p>
          <h1 className="text-3xl font-semibold">
            {monthLabel(report.month)} monthly report
          </h1>
        </div>
        <Link
          className={buttonVariants()}
          href={`/reports/monthly/${report.id}/edit`}
        >
          <PencilSimpleIcon /> Edit report
        </Link>
      </div>
      <Badge variant={report.status === "complete" ? "default" : "secondary"}>
        {report.status}
      </Badge>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Weekly entries" value={String(weeklyReports.length)} />
        <Metric title="Arrows" value={`${load.shot} / ${load.planned}`} />
        <Metric
          title="Load completion"
          value={`${load.completion.toFixed(0)}%`}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scoring by distance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="sr-only">
                Monthly scoring averages by distance
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Distance</TableHead>
                  <TableHead scope="col">Average</TableHead>
                  <TableHead scope="col">Total</TableHead>
                  <TableHead scope="col">Rounds</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scores.map((item) => (
                  <TableRow key={item.distanceM}>
                    <TableHead scope="row">{item.distanceM} m</TableHead>
                    <TableCell>{item.average.toFixed(2)}</TableCell>
                    <TableCell>{item.total}</TableCell>
                    <TableCell>{item.rounds}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Notes title="Coach summary" text={report.coachSummary} />
        <Notes
          title="Performance highlights"
          text={report.performanceHighlights}
        />
        <Notes title="Next-month plan" text={report.nextMonthPlan.notes} />
        <Notes title="Action items" text={report.actionItems.join("\n")} />
      </div>
    </article>
  );
};

export const MonthlyReportPreviewSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-muted h-12 w-80 animate-pulse rounded-xl" />
    <div className="bg-muted h-48 animate-pulse rounded-xl" />
    <div className="bg-muted h-80 animate-pulse rounded-xl" />
  </div>
);
const EmptyReport = () => (
  <Empty className="min-h-96 border">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <ChartLineUpIcon />
      </EmptyMedia>
      <EmptyTitle>Monthly report not found</EmptyTitle>
      <EmptyDescription>
        Choose a report from the reports workspace.
      </EmptyDescription>
      <Link className={buttonVariants()} href="/reports">
        Back to reports
      </Link>
    </EmptyHeader>
  </Empty>
);
const Metric = ({ title, value }: { title: string; value: string }) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-muted-foreground text-sm">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </CardContent>
  </Card>
);
const Notes = ({ title, text }: { title: string; text: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="whitespace-pre-wrap">{text || "None recorded."}</p>
    </CardContent>
  </Card>
);
