"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { monthLabel } from "../report-calculations";
import type {
  MonthlyPerformanceReport,
  WeeklyPerformanceReport,
} from "../report-types";

interface AthleteName {
  athleteId: string;
  fullName: string;
}
type AthleteMap = Map<string, AthleteName>;

export const WeeklyReportTable = ({
  rows,
  athleteById,
}: {
  rows: WeeklyPerformanceReport[];
  athleteById: AthleteMap;
}) =>
  rows.length ? (
    <ReportCard>
      <Table>
        <caption className="sr-only">Weekly performance entries</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Week</TableHead>
            <TableHead scope="col">Athlete</TableHead>
            <TableHead scope="col">Distance</TableHead>
            <TableHead scope="col">Average</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.weekStart}</TableCell>
              <TableCell>
                {athleteById.get(row.athleteId)?.fullName ?? "Unknown athlete"}
              </TableCell>
              <TableCell>
                {row.distanceM ? `${row.distanceM} m` : "Not recorded"}
              </TableCell>
              <TableCell>
                {row.scores.length
                  ? (
                      row.scores.reduce((total, score) => total + score, 0) /
                      row.scores.length
                    ).toFixed(2)
                  : "Not recorded"}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {row.status.replace("-", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  className="underline underline-offset-4"
                  href={`/reports/weekly/${row.id}`}
                >
                  View weekly report
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportCard>
  ) : (
    <ReportEmpty label="No weekly entries match these filters." />
  );

export const MonthlyReportTable = ({
  rows,
  athleteById,
  month,
}: {
  rows: MonthlyPerformanceReport[];
  athleteById: AthleteMap;
  month: string;
}) => {
  const monthRows = month ? rows.filter((row) => row.month === month) : rows;
  return monthRows.length ? (
    <ReportCard>
      <Table>
        <caption className="sr-only">Monthly performance reports</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Month</TableHead>
            <TableHead scope="col">Athlete</TableHead>
            <TableHead scope="col">Highlights</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{monthLabel(row.month)}</TableCell>
              <TableCell>
                {athleteById.get(row.athleteId)?.fullName ?? "Unknown athlete"}
              </TableCell>
              <TableCell>
                {row.performanceHighlights || "No highlights"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={row.status === "complete" ? "default" : "secondary"}
                >
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  className="underline underline-offset-4"
                  href={`/reports/monthly/${row.id}`}
                >
                  View monthly report
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportCard>
  ) : (
    <ReportEmpty label="No monthly reports match these filters." />
  );
};

const ReportCard = ({ children }: { children: React.ReactNode }) => (
  <Card>
    <CardContent className="overflow-x-auto p-0">{children}</CardContent>
  </Card>
);
const ReportEmpty = ({ label }: { label: string }) => (
  <Empty className="border">
    <EmptyHeader>
      <CalendarBlankIcon />
      <EmptyTitle>No reports</EmptyTitle>
      <EmptyDescription>{label}</EmptyDescription>
    </EmptyHeader>
  </Empty>
);
