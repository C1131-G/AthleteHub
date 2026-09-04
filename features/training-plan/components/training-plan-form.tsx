"use client";

import { ArrowLeftIcon, FloppyDiskIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormEvent } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { useAthletes } from "@/features/athlete/use-athletes";

import { trainingPlanHref, trainingPlansHref } from "../training-plan-routes";
import type { SeasonTrainingPlanInput } from "../training-plan-types";
import { useTrainingPlans } from "../use-training-plans";
import { TrainingPlanDetailsFields } from "./training-plan-details-fields";
import { TrainingPlanEventFields } from "./training-plan-event-fields";
import { focusFirstError, toFormErrors } from "./training-plan-form-errors";
import type { PlanFormErrors } from "./training-plan-form-errors";
import { blankPlan, planToFormState } from "./training-plan-form-state";
import type { TrainingPlanFormState } from "./training-plan-form-state";
import { PlanNotFound, TrainingPlanSkeleton } from "./training-plan-parts";
import { validateTrainingPlanForm } from "./training-plan-validation";
import { TrainingPlanWeekFields } from "./training-plan-week-fields";

const optionalNumber = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : undefined;
};

const toInput = (form: TrainingPlanFormState): SeasonTrainingPlanInput => ({
  athleteId: form.athleteId,
  endsOn: form.endsOn,
  events: form.events.map((event) => ({
    dateStatus: event.dateStatus,
    endsOn: event.endsOn || undefined,
    id: event.id,
    location: event.location,
    name: event.name,
    notes: event.notes,
    priority: event.priority,
    startsOn: event.startsOn || undefined,
  })),
  name: form.name,
  startsOn: form.startsOn,
  status: form.status,
  strategyNotes: form.strategyNotes,
  targetDistanceM: optionalNumber(form.targetDistanceM),
  targetScore: optionalNumber(form.targetScore),
  weeks: form.weeks.map((week) => ({
    arrowsPlanned: Number(week.arrowsPlanned),
    id: week.id,
    technicalFocus: week.technicalFocus,
    trainingDaysPlanned: Number(week.trainingDaysPlanned),
    weekStart: week.weekStart,
  })),
});

/**
 * Gate only. The body seeds its state from the queries on first render, so it
 * must not mount until those stores hold real data.
 */
export const TrainingPlanForm = ({
  planId,
}: {
  planId?: string | undefined;
}) => {
  const { ready: athletesReady } = useAthletes();
  const { ready: plansReady } = useTrainingPlans();

  if (!(athletesReady && plansReady)) {
    return <TrainingPlanSkeleton />;
  }
  return <TrainingPlanFormBody planId={planId} />;
};

const TrainingPlanFormBody = ({ planId }: { planId?: string | undefined }) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { athletes } = useAthletes();
  const { createPlan, getPlan, updatePlan } = useTrainingPlans();
  const existing = planId ? getPlan(planId) : undefined;
  const [form, setForm] = useState<TrainingPlanFormState>(() =>
    existing ? planToFormState(existing) : blankPlan(athletes[0]?.id ?? "")
  );
  const [errors, setErrors] = useState<PlanFormErrors>({});

  if (planId && !existing) {
    return <PlanNotFound />;
  }

  const update = <K extends keyof TrainingPlanFormState>(
    key: K,
    value: TrainingPlanFormState[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateTrainingPlanForm(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      return;
    }
    startTransition(async () => {
      const result = planId
        ? await updatePlan(planId, toInput(form))
        : await createPlan(toInput(form));
      if (result.status === "saved") {
        router.push(trainingPlanHref(result.record.id));
        return;
      }
      const mapped = toFormErrors(result.fieldErrors);
      setErrors(mapped);
      focusFirstError(mapped);
    });
  };

  const messages = Object.entries(errors);
  return (
    <form className="space-y-6" noValidate onSubmit={submit}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {planId ? "Edit training plan" : "New training plan"}
          </h1>
          <p className="text-muted-foreground mt-2">
            Set weekly arrow targets, season goals, and competition events.
          </p>
        </div>
        <Link
          className={buttonVariants({ variant: "ghost" })}
          href={trainingPlansHref()}
        >
          <ArrowLeftIcon /> Cancel
        </Link>
      </div>
      {messages.length > 0 && (
        <div
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4"
          id="plan-error-summary"
          role="alert"
        >
          <p className="font-medium">Check the plan before saving.</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {messages.map(([controlId, message]) => (
              <li key={controlId}>
                <a className="underline" href={`#${controlId}`}>
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <TrainingPlanDetailsFields errors={errors} form={form} update={update} />
      <TrainingPlanWeekFields errors={errors} form={form} update={update} />
      <TrainingPlanEventFields errors={errors} form={form} update={update} />
      <div className="flex justify-end">
        <Button disabled={pending} type="submit">
          <FloppyDiskIcon /> {pending ? "Saving…" : "Save plan"}
        </Button>
      </div>
    </form>
  );
};
