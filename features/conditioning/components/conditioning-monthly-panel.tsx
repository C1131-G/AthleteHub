"use client";

import Link from "next/link";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  activeProgrammeFor,
  findPreviousAssessment,
  formatDuration,
  latestAssessmentFor,
  programmeMinutesByIntensity,
} from "../conditioning-calculations";
import {
  conditioningAssessmentHref,
  conditioningHref,
  conditioningProgrammeHref,
} from "../conditioning-routes";
import {
  assessmentStatusLabel,
  intensityLabel,
  phaseLabel,
  programmeStatusLabel,
  ratingLabel,
} from "../conditioning-types";
import type { ConditioningAssessment } from "../conditioning-types";
import { useConditioning } from "../use-conditioning";

const changeLabel = (
  prior: ConditioningAssessment["results"][number] | undefined,
  result: ConditioningAssessment["results"][number]
) => {
  if (!prior) {
    return "No previous";
  }
  const delta = result.value - prior.value;
  if (delta === 0) {
    return "No change";
  }
  const improved =
    result.improvementDirection === "higher" ? delta > 0 : delta < 0;
  return improved ? `+${delta}` : `${delta}`;
};

const formatValue = (result: ConditioningAssessment["results"][number]) =>
  result.unit === "seconds"
    ? formatDuration(result.value)
    : `${result.value} ${result.unit === "custom" ? result.customUnit || "units" : result.unit}`;

/**
 * The conditioning block inside a monthly report: latest assessment with test
 * changes, current programme phase and states, and coach recommendations.
 */
export const ConditioningMonthlyPanel = ({
  athleteId,
  month,
}: {
  athleteId: string;
  month: string;
}) => {
  const { assessments, programmes } = useConditioning();
  const assessment = latestAssessmentFor(assessments, athleteId, month);
  const previous = useMemo(
    () =>
      assessment ? findPreviousAssessment(assessments, assessment) : undefined,
    [assessments, assessment]
  );
  const programme = activeProgrammeFor(programmes, athleteId, month);

  if (!assessment && !programme) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Strength & conditioning</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            No conditioning assessment or active programme for this month.
          </p>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={conditioningHref(athleteId)}
          >
            Open conditioning
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Strength & conditioning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {assessment ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  assessment.status === "completed" ? "default" : "secondary"
                }
              >
                {assessmentStatusLabel[assessment.status]}
              </Badge>
              <Link
                className="text-sm underline underline-offset-4"
                href={conditioningAssessmentHref(assessment.id)}
              >
                Assessment from {assessment.assessedOn}
              </Link>
            </div>
            {assessment.results.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption className="sr-only">
                    Conditioning test changes from the previous assessment
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Test</TableHead>
                      <TableHead scope="col">Current</TableHead>
                      <TableHead scope="col">Previous</TableHead>
                      <TableHead scope="col">Change</TableHead>
                      <TableHead scope="col">Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessment.results.map((result) => {
                      const prior = previous?.results.find(
                        (candidate) =>
                          candidate.key === result.key &&
                          candidate.unit === result.unit
                      );
                      const change = changeLabel(prior, result);
                      return (
                        <TableRow key={result.id}>
                          <TableHead scope="row">{result.label}</TableHead>
                          <TableCell>{formatValue(result)}</TableCell>
                          <TableCell>
                            {prior ? formatValue(prior) : "—"}
                          </TableCell>
                          <TableCell>{change}</TableCell>
                          <TableCell>{ratingLabel[result.rating]}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No test results recorded on this assessment.
              </p>
            )}
            {assessment.recommendations.length ? (
              <div>
                <p className="text-sm font-medium">Coach recommendations</p>
                <ul className="text-muted-foreground mt-1 list-disc pl-5 text-sm">
                  {assessment.recommendations.map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
        {programme ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {programmeStatusLabel[programme.status]}
              </Badge>
              <Badge variant="outline">
                Phase: {phaseLabel[programme.phase]}
                {programme.phase === "custom" && programme.customPhase
                  ? ` (${programme.customPhase})`
                  : ""}
              </Badge>
              <Link
                className="text-sm underline underline-offset-4"
                href={conditioningProgrammeHref(programme.id)}
              >
                {programme.title}
              </Link>
            </div>
            {programme.restrictionNotes ? (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                Restricted: {programme.restrictionNotes}
              </p>
            ) : null}
            <div className="max-w-md space-y-2">
              {programmeMinutesByIntensity(programme).map((entry) => (
                <div key={entry.intensity}>
                  <div className="flex justify-between text-xs">
                    <span>{intensityLabel[entry.intensity]}</span>
                    <span>{entry.minutes} min/week</span>
                  </div>
                  <Progress value={entry.minutes} />
                </div>
              ))}
            </div>
            {programme.objectives.length ? (
              <div>
                <p className="text-sm font-medium">Next-month focus</p>
                <ul className="text-muted-foreground mt-1 list-disc pl-5 text-sm">
                  {programme.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No active programme covers this month.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
