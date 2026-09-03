"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  conditioningNewAssessmentHref,
  conditioningNewProgrammeHref,
} from "@/features/conditioning/conditioning-routes";
import {
  assessmentStatusLabel,
  programmeStatusLabel,
} from "@/features/conditioning/conditioning-types";
import { formatDate } from "@/lib/format";

import { confirmCycleStep } from "../cycle-step-actions";
import { conditioningCoverageFor } from "../monthly-cycle-lifecycle";
import type {
  CycleDomainContext,
  CycleStepView,
} from "../monthly-cycle-lifecycle";
import type { MonthlyAthleteCycle } from "../monthly-cycle-types";
import { useCycleGuard } from "./cycle-guard";
import { CycleStepActions } from "./cycle-step-actions";
import { StaleStepAlert } from "./stale-step-alert";

const programmeStatusText = (status: string) =>
  Object.entries(programmeStatusLabel).find(([key]) => key === status)?.[1] ??
  status;

const exceptionStatuses = [
  { label: "Medical exemption", value: "medical-exemption" },
  { label: "Absence", value: "absent" },
  { label: "Injury", value: "injury" },
  { label: "Testing unavailable", value: "unavailable-testing" },
] as const;

export const ConditioningStep = ({
  context,
  cycle,
  stepView,
}: {
  context: CycleDomainContext;
  cycle: MonthlyAthleteCycle;
  stepView: CycleStepView;
}) => {
  const router = useRouter();
  const { setDirty } = useCycleGuard();
  const coverage = conditioningCoverageFor(
    context.assessments,
    context.programmes,
    cycle.athleteId,
    cycle.month
  );
  const covered = Boolean(coverage.assessment && coverage.programme);
  const [exceptionStatus, setExceptionStatus] = useState("medical-exemption");
  const [explanation, setExplanation] = useState(
    cycle.steps.conditioning.reason ?? ""
  );
  const [error, setError] = useState("");

  const confirm = () => {
    if (covered && coverage.assessment && coverage.programme) {
      const result = confirmCycleStep(cycle, "conditioning", {
        sources: stepView.currentSources,
        status: "complete",
      });
      if (result.status !== "saved") {
        setError("Could not save this confirmation on the device.");
        return false;
      }
      return true;
    }
    if (!explanation.trim()) {
      setError("Describe the exemption or situation before continuing.");
      return false;
    }
    const label =
      exceptionStatuses.find((entry) => entry.value === exceptionStatus)
        ?.label ?? exceptionStatus;
    const result = confirmCycleStep(cycle, "conditioning", {
      reason: `${label}: ${explanation.trim()}`,
      // Keep the live references so a partial exception does not become stale
      // immediately when the assessment or programme is already known.
      sources: stepView.currentSources,
      status: "exception",
    });
    if (result.status !== "saved") {
      setError("Could not save this exception on the device.");
      return false;
    }
    setDirty(false);
    return true;
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground mt-2">
          The month needs a conditioning assessment dated within it and a
          programme covering the following period.
        </p>
      </div>
      {stepView.status === "stale" ? (
        <StaleStepAlert label="The conditioning records" />
      ) : null}
      {error ? (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Assessment this month</CardTitle>
          {coverage.assessment ? (
            <CardDescription>
              {assessmentStatusLabel[coverage.assessment.status]} ·{" "}
              {formatDate(coverage.assessment.assessedOn)}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {coverage.assessment ? (
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-sm">
                  Tests recorded
                </dt>
                <dd className="font-medium">
                  {coverage.assessment.results.length}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm">Restrictions</dt>
                <dd className="font-medium">
                  {coverage.assessment.restrictionNotes || "None noted"}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                No assessment is dated within this month.
              </p>
              <Link
                className={buttonVariants({ variant: "outline" })}
                href={conditioningNewAssessmentHref(cycle.athleteId)}
              >
                Record assessment
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Programme for the following period</CardTitle>
          {coverage.programme ? (
            <CardDescription>
              {formatDate(coverage.programme.startsOn)} –{" "}
              {formatDate(coverage.programme.endsOn)}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {coverage.programme ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {programmeStatusText(coverage.programme.status)}
              </Badge>
              {coverage.programme.status === "active" ? null : (
                <span className="text-muted-foreground text-sm">
                  A covering programme exists but is not active.
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                No programme covers the following period yet.
              </p>
              <Link
                className={buttonVariants({ variant: "outline" })}
                href={conditioningNewProgrammeHref(cycle.athleteId)}
              >
                Create programme
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
      {covered ? null : (
        <Card>
          <CardHeader>
            <CardTitle>Structured exception</CardTitle>
            <CardDescription>
              Medical exemption, absence, injury, or unavailable testing can
              complete this step with an explanation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="conditioning-exception-status">
                Status
              </FieldLabel>
              <Select
                onValueChange={(value) => {
                  setExceptionStatus(value ?? "medical-exemption");
                  setDirty(true);
                }}
                value={exceptionStatus}
              >
                <SelectTrigger id="conditioning-exception-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exceptionStatuses.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="conditioning-exception-explanation">
                Explanation
              </FieldLabel>
              <Textarea
                id="conditioning-exception-explanation"
                onChange={(event) => {
                  setExplanation(event.target.value);
                  setDirty(true);
                }}
                value={explanation}
              />
            </Field>
          </CardContent>
        </Card>
      )}
      {covered && stepView.status !== "complete" ? (
        <Button onClick={confirm} type="button" variant="outline">
          <CheckCircleIcon aria-hidden /> Confirm conditioning coverage
        </Button>
      ) : null}
      <CycleStepActions
        cycleId={cycle.id}
        onSaveContinue={() => {
          if (confirm()) {
            router.push(`/monthly-cycles/${cycle.id}/review`);
          }
        }}
        onSaveExit={() => {
          if (confirm()) {
            router.push(`/monthly-cycles?month=${cycle.month}`);
          }
        }}
        step="conditioning"
      />
    </div>
  );
};
