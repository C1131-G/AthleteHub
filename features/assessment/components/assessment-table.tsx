"use client";
import Link from "next/link";

import { ArchiveAction } from "@/components/archive-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { assessmentEditHref, assessmentHref } from "../assessment-routes";
import { assessmentTypeLabel } from "../assessment-types";
import type { Assessment } from "../assessment-types";
import { useAssessments } from "../use-assessments";

export const AssessmentTable = ({
  archived,
  rows,
  athleteById,
}: {
  archived?: boolean;
  rows: Assessment[];
  athleteById: Map<string, { fullName: string; athleteId: string }>;
}) => {
  const { archiveAssessment, restoreAssessment } = useAssessments();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {archived ? "Archived assessments" : "Assessments"} ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">
              Dated athlete assessments
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Athlete</TableHead>
                <TableHead scope="col">Type</TableHead>
                <TableHead scope="col">Date</TableHead>
                <TableHead scope="col" className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableHead scope="row">
                      {athleteById.get(row.athleteId)?.fullName ??
                        "Unknown athlete"}
                    </TableHead>
                    <TableCell>
                      {assessmentTypeLabel[row.assessmentType]}
                    </TableCell>
                    <TableCell>{row.assessedOn}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          className="underline-offset-4 hover:underline"
                          href={assessmentHref(row.id)}
                        >
                          View
                        </Link>
                        <Link
                          className="underline-offset-4 hover:underline"
                          href={assessmentEditHref(row.id)}
                        >
                          Edit
                        </Link>
                        {archived ? (
                          <Button
                            onClick={() => restoreAssessment(row.id)}
                            size="sm"
                            variant="outline"
                          >
                            Restore
                          </Button>
                        ) : (
                          <ArchiveAction
                            label={`the ${row.assessedOn} assessment`}
                            onArchive={() => archiveAssessment(row.id)}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4}>No matching assessments.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
