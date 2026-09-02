"use client";

import { PencilSimpleIcon, ChartLineUpIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { initials } from "@/lib/format";

import { scoreSummary } from "../report-calculations";
import { useReports } from "../use-reports";

export const WeeklyReportPreview = ({ reportId }: { reportId: string }) => {
  const { athletes, ready: athletesReady } = useAthletes();
  const { getWeekly, ready: reportsReady } = useReports();
  const report = getWeekly(reportId);
  const athlete = athletes.find((item) => item.id === report?.athleteId);

  if (!athletesReady || !reportsReady) {
    return <WeeklyReportPreviewSkeleton />;
  }
  if (!report || !athlete) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChartLineUpIcon />
          </EmptyMedia>
          <EmptyTitle>Weekly report not found</EmptyTitle>
          <EmptyDescription>
            The report may have been removed or the link is incorrect.
          </EmptyDescription>
          <Link className={buttonVariants()} href="/reports">
            Back to reports
          </Link>
        </EmptyHeader>
      </Empty>
    );
  }

  const total = report.scores.reduce((sum, score) => sum + score, 0);
  const average = report.scores.length ? total / report.scores.length : 0;
  return (
    <article className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials(athlete.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-muted-foreground text-sm">
              {athlete.fullName} · {athlete.athleteId}
            </p>
            <h1 className="text-3xl font-semibold">
              Weekly performance report
            </h1>
            <p className="text-muted-foreground mt-1">
              Week of {report.weekStart}
            </p>
          </div>
        </div>
        <Link
          className={buttonVariants()}
          href={`/reports/weekly/${report.id}/edit`}
        >
          <PencilSimpleIcon /> Edit report
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge>{report.status.replace("-", " ")}</Badge>
        {report.distanceM && (
          <Badge variant="secondary">{report.distanceM} m</Badge>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          title="Total score"
          value={report.scores.length ? String(total) : "—"}
        />
        <Metric
          title="Average"
          value={report.scores.length ? average.toFixed(2) : "—"}
        />
        <Metric
          title="Arrows"
          value={`${report.arrowsShot ?? 0} / ${report.arrowsPlanned ?? 0}`}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Scoring rounds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="sr-only">
                Scoring rounds for {athlete.fullName}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Round</TableHead>
                  <TableHead scope="col">Score</TableHead>
                  <TableHead scope="col">Maximum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.scores.map((score, index) => (
                  <TableRow key={`${report.id}-${index}`}>
                    <TableHead scope="row">{index + 1}</TableHead>
                    <TableCell>{score}</TableCell>
                    <TableCell>{report.maxScore ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Notes title="Performance notes" items={[report.performanceNotes]} />
        <Notes title="Action items" items={report.actionItems} />
      </div>
      {report.scores.length > 0 && report.distanceM && (
        <Card>
          <CardHeader>
            <CardTitle>Distance context</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreSummary([report], report.weekStart.slice(0, 7)).map(
              (item) => (
                <p key={item.distanceM}>
                  {item.distanceM} m · {item.average.toFixed(2)} average across{" "}
                  {item.rounds} rounds
                </p>
              )
            )}
          </CardContent>
        </Card>
      )}
    </article>
  );
};

export const WeeklyReportPreviewSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-muted h-12 w-80 animate-pulse rounded-xl" />
    <div className="bg-muted h-48 animate-pulse rounded-xl" />
    <div className="bg-muted h-64 animate-pulse rounded-xl" />
  </div>
);

const Metric = ({ title, value }: { title: string; value: string }) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-muted-foreground text-sm">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </CardContent>
  </Card>
);
const Notes = ({ title, items }: { title: string; items: string[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {items.length ? (
        <ul className="list-disc space-y-2 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">None recorded.</p>
      )}
    </CardContent>
  </Card>
);
