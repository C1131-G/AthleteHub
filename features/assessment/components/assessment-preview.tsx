"use client";
// The preview preserves the discriminated record shape while rendering a compact definition list.
// oxlint-disable react-doctor/js-combine-iterations
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
import { useAthletes } from "@/features/athlete/use-athletes";
import { conditioningHref } from "@/features/conditioning/conditioning-routes";

import { assessmentEditHref } from "../assessment-routes";
import { assessmentTypeLabel } from "../assessment-types";
import { useAssessments } from "../use-assessments";

export const AssessmentPreview = ({
  assessmentId,
}: {
  assessmentId: string;
}) => {
  const { athletes, ready: athletesReady } = useAthletes();
  const { getAssessment, ready } = useAssessments();
  const record = getAssessment(assessmentId);
  const athlete = athletes.find((item) => item.id === record?.athleteId);
  if (!(ready && athletesReady)) {
    return <AssessmentSkeleton />;
  }
  if (!record || !athlete) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon" />
          <EmptyTitle>Assessment not found</EmptyTitle>
          <EmptyDescription>
            The assessment may have been removed or the link is incorrect.
          </EmptyDescription>
          <Link className={buttonVariants()} href="/reports?tab=assessments">
            Back to assessments
          </Link>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">
            {athlete.fullName} · {athlete.athleteId}
          </p>
          <h2 className="text-3xl font-semibold">
            {assessmentTypeLabel[record.assessmentType]} assessment
          </h2>
          <p className="text-muted-foreground mt-1">
            Recorded on {record.assessedOn}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className={buttonVariants()}
            href={assessmentEditHref(record.id)}
          >
            Edit assessment
          </Link>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={conditioningHref(record.athleteId)}
          >
            Conditioning history
          </Link>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={`/athletes/equipment?athleteId=${encodeURIComponent(record.athleteId)}`}
          >
            Equipment history
          </Link>
        </div>
      </div>
      <Badge>{assessmentTypeLabel[record.assessmentType]}</Badge>
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            {Object.entries(record)
              .filter(
                ([key]) =>
                  ![
                    "id",
                    "athleteId",
                    "assessmentType",
                    "assessedOn",
                    "createdAt",
                    "updatedAt",
                    "weeklyReportId",
                  ].includes(key)
              )
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-muted-foreground text-sm">
                    {key.replaceAll(/(?<capital>[A-Z])/g, " $<capital>")}
                  </dt>
                  <dd className="font-medium whitespace-pre-wrap">
                    {Array.isArray(value)
                      ? value.join(", ") || "Not recorded"
                      : String(value ?? "Not recorded")}
                  </dd>
                </div>
              ))}
          </dl>
        </CardContent>
      </Card>
    </article>
  );
};

export const AssessmentSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-muted h-12 w-80 animate-pulse rounded-xl" />
    <div className="bg-muted h-64 animate-pulse rounded-xl" />
    <div className="bg-muted h-48 animate-pulse rounded-xl" />
  </div>
);
