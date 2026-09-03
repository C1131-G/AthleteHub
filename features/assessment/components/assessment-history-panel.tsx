"use client";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  assessmentsForMonth,
  assessmentsForWeek,
  latestByType,
} from "../assessment-calculations";
import { assessmentHref } from "../assessment-routes";
import { assessmentTypeLabel } from "../assessment-types";
import type { Assessment, AssessmentType } from "../assessment-types";
import { useAssessments } from "../use-assessments";

const AssessmentHistoryPanel = ({
  athleteId,
  month,
  weekStart,
}: {
  athleteId: string;
  month?: string;
  weekStart?: string;
}) => {
  const { assessments, ready } = useAssessments();
  if (!ready) {
    return null;
  }
  let rows: Assessment[] = [];
  if (weekStart) {
    rows = assessmentsForWeek(assessments, athleteId, weekStart);
  } else if (month) {
    rows = assessmentsForMonth(assessments, athleteId, month);
  }
  const latest = month
    ? latestByType(rows, month)
    : new Map<AssessmentType, Assessment>();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {month ? "Assessments this month" : "Assessments this week"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="space-y-3">
            {month
              ? [...latest.values()].map((record) => (
                  <div className="border-b pb-3" key={record.id}>
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">
                        {assessmentTypeLabel[record.assessmentType]}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {record.assessedOn}
                      </span>
                    </div>
                    <Link
                      className="text-sm underline-offset-4 hover:underline"
                      href={assessmentHref(record.id)}
                    >
                      View latest record
                    </Link>
                    <details className="mt-2 text-sm">
                      <summary className="cursor-pointer">
                        Show dated history
                      </summary>
                      <ul className="mt-2 space-y-1 pl-4">
                        {rows.map((entry) =>
                          entry.assessmentType === record.assessmentType ? (
                            <li key={entry.id}>
                              {entry.assessedOn} —{" "}
                              <Link
                                className="underline-offset-4 hover:underline"
                                href={assessmentHref(entry.id)}
                              >
                                View
                              </Link>
                            </li>
                          ) : null
                        )}
                      </ul>
                    </details>
                  </div>
                ))
              : rows.map((record) => (
                  <div
                    className="flex justify-between gap-2 border-b pb-3"
                    key={record.id}
                  >
                    <span>
                      {assessmentTypeLabel[record.assessmentType]} ·{" "}
                      {record.assessedOn}
                    </span>
                    <Link
                      className="underline-offset-4 hover:underline"
                      href={assessmentHref(record.id)}
                    >
                      View
                    </Link>
                  </div>
                ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Not recorded.</p>
        )}
      </CardContent>
    </Card>
  );
};
export { AssessmentHistoryPanel };
