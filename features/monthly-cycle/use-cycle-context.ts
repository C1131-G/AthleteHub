"use client";

import { useAssessments } from "@/features/assessment/use-assessments";
import { useAthletes } from "@/features/athlete/use-athletes";
import { useConditioning } from "@/features/conditioning/use-conditioning";
import { useEquipment } from "@/features/equipment/use-equipment";
import { useReports } from "@/features/report/use-reports";
import { useAllSessions } from "@/features/session/use-sessions";
import { useTrainingPlans } from "@/features/training-plan/use-training-plans";

import { deriveCycleView } from "./monthly-cycle-lifecycle";
import type { CycleDomainContext, CycleView } from "./monthly-cycle-lifecycle";
import type { MonthlyAthleteCycle } from "./monthly-cycle-types";
import { useMonthlyCycles } from "./use-monthly-cycles";

export interface CycleContextState {
  athlete: ReturnType<typeof useAthletes>["athletes"][number] | undefined;
  context: CycleDomainContext | undefined;
  cycle: MonthlyAthleteCycle | undefined;
  ready: boolean;
  view: CycleView | undefined;
}

/**
 * Gathers the slice of every domain the lifecycle reads for one cycle. Each
 * collection is a separate query, so `ready` gates the workflow on all of them
 * having loaded — a step must never judge coverage from a half-loaded view.
 */
export const useCycleContext = (cycleId: string): CycleContextState => {
  const { cycles, ready: cyclesReady } = useMonthlyCycles();
  const { athletes, ready: athletesReady } = useAthletes();
  const { listByAthlete, ready: equipmentReady } = useEquipment();
  const { listMonthly, listWeekly, ready: reportsReady } = useReports();
  const { plans, ready: plansReady } = useTrainingPlans();
  const { data: sessions, isPending: sessionsPending } = useAllSessions();
  const { assessments: datedAssessments, ready: datedAssessmentsReady } =
    useAssessments();
  const {
    assessments,
    programmes,
    ready: conditioningReady,
  } = useConditioning();

  const cycle = cycles.find((entry) => entry.id === cycleId);
  const athlete = athletes.find((entry) => entry.id === cycle?.athleteId);
  const ready =
    cyclesReady &&
    athletesReady &&
    equipmentReady &&
    reportsReady &&
    plansReady &&
    conditioningReady &&
    datedAssessmentsReady &&
    !sessionsPending;

  const context: CycleDomainContext | undefined = cycle
    ? {
        assessments: assessments.filter(
          (assessment) => assessment.athleteId === cycle.athleteId
        ),
        athlete,
        athleteId: cycle.athleteId,
        datedAssessments: datedAssessments.filter(
          (assessment) => assessment.athleteId === cycle.athleteId
        ),
        equipmentSetups: athlete ? listByAthlete(athlete.id) : [],
        monthlyReport: listMonthly.find(
          (report) =>
            report.athleteId === cycle.athleteId && report.month === cycle.month
        ),
        plans,
        programmes: programmes.filter(
          (programme) => programme.athleteId === cycle.athleteId
        ),
        sessions: (sessions ?? []).filter(
          (session) => session.athleteId === cycle.athleteId
        ),
        weeklyReports: listWeekly.filter(
          (report) => report.athleteId === cycle.athleteId
        ),
      }
    : undefined;

  return {
    athlete,
    context,
    cycle,
    ready,
    view: cycle && context ? deriveCycleView(cycle, context) : undefined,
  };
};
