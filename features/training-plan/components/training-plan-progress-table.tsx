"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { PlanWeekProgress } from "../training-plan-calculations";
import { formatVariance } from "../training-plan-format";

export const TrainingPlanProgressTable = ({
  progress,
}: {
  progress: PlanWeekProgress[];
}) => (
  <Card>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <caption className="sr-only">
            Planned and actual weekly load, with variance
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Week</TableHead>
              <TableHead scope="col">Planned arrows</TableHead>
              <TableHead scope="col">Per training day</TableHead>
              <TableHead scope="col">Actual arrows</TableHead>
              <TableHead scope="col">Variance</TableHead>
              <TableHead scope="col">Technical focus</TableHead>
              <TableHead scope="col">
                <span className="sr-only">Weekly report</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {progress.map((week) => (
              <TableRow key={week.weekStart}>
                <TableHead className="h-auto p-3 font-normal" scope="row">
                  {week.weekStart}
                </TableHead>
                <TableCell>{week.plannedArrows}</TableCell>
                <TableCell>
                  {Math.round(week.arrowsPerTrainingDay)} ×{" "}
                  {week.trainingDaysPlanned} days
                </TableCell>
                <TableCell>
                  {week.actualArrows === undefined ? (
                    <Badge variant="outline">No report yet</Badge>
                  ) : (
                    week.actualArrows
                  )}
                </TableCell>
                <TableCell
                  className={
                    week.variance !== undefined && week.variance < 0
                      ? "text-destructive"
                      : ""
                  }
                >
                  {formatVariance(week.variance)}
                </TableCell>
                <TableCell className="whitespace-normal">
                  {week.technicalFocus || "Not set"}
                </TableCell>
                <TableCell className="text-right">
                  {week.reportId ? (
                    <Link
                      className="underline underline-offset-4"
                      href={`/reports/weekly/${week.reportId}`}
                    >
                      View report
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);
