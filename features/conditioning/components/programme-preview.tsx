"use client";

import { BarbellIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAthletes } from "@/features/athlete/use-athletes";
import { trainingPlanHref } from "@/features/training-plan/training-plan-routes";
import type {
  SeasonTrainingPlan,
  TrainingPlanEvent,
} from "@/features/training-plan/training-plan-types";
import { useTrainingPlans } from "@/features/training-plan/use-training-plans";
import { formatDate } from "@/lib/format";

import {
  WEEKDAY_LABELS,
  programmeMinutesByIntensity,
} from "../conditioning-calculations";
import {
  conditioningNewProgrammeHref,
  conditioningProgrammeEditHref,
} from "../conditioning-routes";
import {
  intensityLabel,
  phaseLabel,
  programmeStatusLabel,
} from "../conditioning-types";
import type { ConditioningProgramme } from "../conditioning-types";
import { useConditioning } from "../use-conditioning";
import { WeeklyMinutesChart } from "./conditioning-charts";
import type { MinutesRow } from "./conditioning-charts";
import { ProgrammeNotFound } from "./programme-not-found";
import { ProgrammePreviewSkeleton } from "./programme-preview-skeleton";

const intensityBadgeVariant = {
  high: "default",
  low: "secondary",
  moderate: "secondary",
  recovery: "outline",
} as const;

export const ProgrammePreview = ({ programmeId }: { programmeId: string }) => {
  const { athletes, ready: athletesReady } = useAthletes();
  const { getProgramme, ready: conditioningReady } = useConditioning();
  const { plans, ready: plansReady } = useTrainingPlans();
  const programme = getProgramme(programmeId);
  const athlete = athletes.find((item) => item.id === programme?.athleteId);
  const linkedPlan = plans.find(
    (plan) => plan.id === programme?.trainingPlanId
  );
  const nearbyEvents = useMemo(() => {
    if (!(programme && linkedPlan)) {
      return [];
    }
    return linkedPlan.events
      .filter(
        (event) =>
          event.startsOn !== undefined &&
          event.startsOn <= programme.endsOn &&
          (event.endsOn ?? event.startsOn) >= programme.startsOn
      )
      .toSorted((a, b) => (a.startsOn ?? "").localeCompare(b.startsOn ?? ""));
  }, [linkedPlan, programme]);
  if (!(athletesReady && conditioningReady && plansReady)) {
    return <ProgrammePreviewSkeleton />;
  }
  if (!programme) {
    return <ProgrammeNotFound />;
  }

  return (
    <article className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-muted-foreground text-sm">
            {athlete?.fullName ?? "Unknown athlete"} ·{" "}
            {athlete?.athleteId ?? programme.athleteId}
          </p>
          <h1 className="text-3xl font-semibold">{programme.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatDate(programme.startsOn)} – {formatDate(programme.endsOn)} ·{" "}
            {phaseLabel[programme.phase]}
            {programme.phase === "custom" && programme.customPhase
              ? `: ${programme.customPhase}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={conditioningNewProgrammeHref(programme.athleteId)}
          >
            <BarbellIcon aria-hidden="true" /> New programme
          </Link>
          <Link
            className={buttonVariants()}
            href={conditioningProgrammeEditHref(programme.id)}
          >
            <PencilSimpleIcon aria-hidden="true" /> Edit programme
          </Link>
        </div>
      </div>
      <Badge variant={programme.status === "active" ? "default" : "secondary"}>
        {programmeStatusLabel[programme.status]}
      </Badge>
      {programme.restrictionNotes ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
          role="note"
        >
          <p className="font-medium">Applicable restrictions</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">
            {programme.restrictionNotes}
          </p>
        </div>
      ) : null}
      <WeeklyScheduleCard programme={programme} />
      <WeeklyMinutesSummary programme={programme} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Objectives</CardTitle>
          </CardHeader>
          <CardContent>
            {programme.objectives.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {programme.objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">None recorded.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Competitions in this block
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProgrammeEvents events={nearbyEvents} plan={linkedPlan} />
            {linkedPlan ? (
              <Link
                className="mt-3 inline-block text-sm underline underline-offset-4"
                href={trainingPlanHref(linkedPlan.id)}
              >
                View season plan
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </article>
  );
};

const ProgrammeEvents = ({
  events,
  plan,
}: {
  events: TrainingPlanEvent[];
  plan: SeasonTrainingPlan | undefined;
}) => {
  if (!plan) {
    return (
      <p className="text-muted-foreground text-sm">
        Not linked to a season training plan.
      </p>
    );
  }
  if (!events.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No season events fall inside this block.
      </p>
    );
  }
  return (
    <ul className="space-y-2 text-sm">
      {events.map((event) => (
        <li key={event.id}>
          <span className="font-medium">{event.name}</span>{" "}
          <span className="text-muted-foreground">
            {event.startsOn ? formatDate(event.startsOn) : "TBD"}
            {event.location ? ` · ${event.location}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
};

const WeeklyScheduleCard = ({
  programme,
}: {
  programme: ConditioningProgramme;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Seven-day schedule</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {WEEKDAY_LABELS.map((label, weekday) => {
        const sessions = programme.sessions
          .filter((session) => session.weekday === weekday)
          .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
        return (
          <div className="rounded-xl border p-3" key={label}>
            <p className="text-muted-foreground mb-2 text-sm font-medium">
              {label}
            </p>
            {sessions.length ? (
              <ul className="space-y-3">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={intensityBadgeVariant[session.intensity]}>
                        {intensityLabel[session.intensity]}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {session.startsAt}–{session.endsAt} · {session.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{session.title}</p>
                    {session.exercises.length ? (
                      <ul className="text-muted-foreground mt-1 list-disc pl-4 text-xs">
                        {session.exercises.map((exercise) => (
                          <li key={exercise.id}>
                            {exercise.name}
                            {exercise.sets !== undefined &&
                            exercise.reps !== undefined
                              ? ` — ${exercise.sets}×${exercise.reps}`
                              : ""}
                            {exercise.loadKg === undefined
                              ? ""
                              : ` @ ${exercise.loadKg} kg`}
                            {exercise.durationSeconds === undefined
                              ? ""
                              : ` — ${Math.floor(exercise.durationSeconds / 60)}:${String(exercise.durationSeconds % 60).padStart(2, "0")}`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {session.notes || "No exercises prescribed."}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">Rest day.</p>
            )}
          </div>
        );
      })}
    </CardContent>
  </Card>
);

const WeeklyMinutesSummary = ({
  programme,
}: {
  programme: ConditioningProgramme;
}) => {
  const rows = useMemo<MinutesRow[]>(
    () =>
      programmeMinutesByIntensity(programme).map((entry) => ({
        id: `minutes-${entry.intensity}`,
        intensity: entry.intensity,
        minutes: entry.minutes,
      })),
    [programme]
  );
  return <WeeklyMinutesChart rows={rows} />;
};
