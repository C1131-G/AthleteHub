"use client";

import { BarbellIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { useAthletes } from "@/features/athlete/use-athletes";

import {
  changeDirection,
  formatValue,
  unitSuffix,
} from "../assessment-result-helpers";
import {
  conditioningAssessmentEditHref,
  conditioningNewAssessmentHref,
} from "../conditioning-routes";
import {
  assessmentStatusLabel,
  categoryLabel,
  ratingLabel,
} from "../conditioning-types";
import type { ConditioningAssessment } from "../conditioning-types";
import { useConditioning } from "../use-conditioning";
import { AssessmentChangeIndicator } from "./assessment-change-indicator";
import { AssessmentNotesCard } from "./assessment-notes-card";
import { AssessmentPreviewSkeleton } from "./assessment-preview-skeleton";
import { AssessmentNotFound } from "./assessment-preview-states";
import { ResultComparisonChart } from "./conditioning-charts";
import type { ComparisonRow } from "./conditioning-charts";

export const AssessmentPreview = ({
  assessmentId,
}: {
  assessmentId: string;
}) => {
  const { athletes, ready: athletesReady } = useAthletes();
  const {
    assessments,
    getAssessment,
    ready: conditioningReady,
  } = useConditioning();
  const assessment = getAssessment(assessmentId);
  const athlete = athletes.find((item) => item.id === assessment?.athleteId);
  if (!(athletesReady && conditioningReady)) {
    return <AssessmentPreviewSkeleton />;
  }
  if (!assessment) {
    return <AssessmentNotFound />;
  }

  return (
    <article className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-muted-foreground text-sm">
            {athlete?.fullName ?? "Unknown athlete"} ·{" "}
            {athlete?.athleteId ?? assessment.athleteId}
          </p>
          <h1 className="text-3xl font-semibold">
            Conditioning assessment — {assessment.assessedOn}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={conditioningNewAssessmentHref(assessment.athleteId)}
          >
            <BarbellIcon aria-hidden="true" /> New assessment
          </Link>
          <Link
            className={buttonVariants()}
            href={conditioningAssessmentEditHref(assessment.id)}
          >
            <PencilSimpleIcon aria-hidden="true" /> Edit assessment
          </Link>
        </div>
      </div>
      <Badge
        variant={assessment.status === "completed" ? "default" : "secondary"}
      >
        {assessmentStatusLabel[assessment.status]}
      </Badge>
      {assessment.restrictionNotes ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
          role="note"
        >
          <p className="font-medium">Restrictions</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">
            {assessment.restrictionNotes}
          </p>
        </div>
      ) : null}
      <ResultsCard assessments={assessments} assessment={assessment} />
      <div className="grid gap-4 lg:grid-cols-2">
        <AssessmentNotesCard
          title="Coach summary"
          text={assessment.coachSummary}
        />
        <AssessmentNotesCard
          title="Strengths"
          text={assessment.strengths.join("\n")}
        />
        <AssessmentNotesCard
          title="Development areas"
          text={assessment.developmentAreas.join("\n")}
        />
        <AssessmentNotesCard
          title="Recommendations"
          text={assessment.recommendations.join("\n")}
        />
      </div>
    </article>
  );
};

const ResultsCard = ({
  assessment,
  assessments,
}: {
  assessment: ConditioningAssessment;
  assessments: ConditioningAssessment[];
}) => {
  const previous = useMemo(() => {
    const candidates = assessments
      .filter(
        (candidate) =>
          candidate.athleteId === assessment.athleteId &&
          candidate.id !== assessment.id &&
          candidate.assessedOn <= assessment.assessedOn
      )
      .toSorted((a, b) => b.assessedOn.localeCompare(a.assessedOn));
    return candidates[0];
  }, [assessments, assessment]);

  const comparisonRowsByUnit = useMemo(() => {
    const grouped = new Map<string, ComparisonRow[]>();
    for (const result of assessment.results) {
      const unit = unitSuffix(result);
      const rows = grouped.get(unit) ?? [];
      rows.push({
        id: `${result.id}-current`,
        label: result.label,
        series: "current",
        unit,
        value: result.value,
      });
      const prior = previous?.results.find(
        (candidate) =>
          candidate.key === result.key && candidate.unit === result.unit
      );
      if (prior) {
        rows.push({
          id: `${result.id}-previous`,
          label: result.label,
          series: "previous",
          unit,
          value: prior.value,
        });
      }
      grouped.set(unit, rows);
    }
    return [...grouped.entries()];
  }, [assessment, previous]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {assessment.results.length ? (
            <Table>
              <TableCaption className="sr-only">
                Test results with previous values and change indicators
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Test</TableHead>
                  <TableHead scope="col">Category</TableHead>
                  <TableHead scope="col">Current</TableHead>
                  <TableHead scope="col">Previous</TableHead>
                  <TableHead scope="col">Change</TableHead>
                  <TableHead scope="col">Rating</TableHead>
                  <TableHead scope="col">Protocol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessment.results.map((result) => {
                  const prior = previous?.results.find(
                    (candidate) =>
                      candidate.key === result.key &&
                      candidate.unit === result.unit
                  );
                  const direction = changeDirection(result, prior);
                  return (
                    <TableRow key={result.id}>
                      <TableHead scope="row">{result.label}</TableHead>
                      <TableCell>{categoryLabel[result.category]}</TableCell>
                      <TableCell>{formatValue(result.value, result)}</TableCell>
                      <TableCell>
                        {prior ? formatValue(prior.value, prior) : "—"}
                      </TableCell>
                      <TableCell>
                        <AssessmentChangeIndicator direction={direction} />
                      </TableCell>
                      <TableCell>{ratingLabel[result.rating]}</TableCell>
                      <TableCell className="text-muted-foreground max-w-72 text-sm">
                        {result.protocol || "—"}
                        {result.notes ? ` — ${result.notes}` : ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              No test results recorded for this assessment.
            </p>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {comparisonRowsByUnit.map(([unit, rows]) => (
          <ResultComparisonChart
            key={unit}
            rows={rows}
            title="Previous versus current"
            unit={unit}
          />
        ))}
      </div>
    </>
  );
};
