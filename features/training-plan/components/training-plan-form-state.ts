import type {
  EventDateStatus,
  EventPriority,
  SeasonTrainingPlan,
  TrainingPlanStatus,
} from "../training-plan-types";

export interface PlanWeekFormState {
  arrowsPlanned: string;
  id: string;
  technicalFocus: string;
  trainingDaysPlanned: string;
  weekStart: string;
}

export interface PlanEventFormState {
  dateStatus: EventDateStatus;
  endsOn: string;
  id: string;
  location: string;
  name: string;
  notes: string;
  priority: EventPriority;
  startsOn: string;
}

export interface TrainingPlanFormState {
  athleteId: string;
  endsOn: string;
  events: PlanEventFormState[];
  name: string;
  startsOn: string;
  status: TrainingPlanStatus;
  strategyNotes: string;
  targetDistanceM: string;
  targetScore: string;
  weeks: PlanWeekFormState[];
}

export type UpdatePlanField = <K extends keyof TrainingPlanFormState>(
  key: K,
  value: TrainingPlanFormState[K]
) => void;

export const blankWeek = (weekStart = ""): PlanWeekFormState => ({
  arrowsPlanned: "",
  id: crypto.randomUUID(),
  technicalFocus: "",
  trainingDaysPlanned: "6",
  weekStart,
});

export const blankEvent = (): PlanEventFormState => ({
  dateStatus: "scheduled",
  endsOn: "",
  id: crypto.randomUUID(),
  location: "",
  name: "",
  notes: "",
  priority: "primary",
  startsOn: "",
});

export const blankPlan = (athleteId = ""): TrainingPlanFormState => ({
  athleteId,
  endsOn: "",
  events: [],
  name: "",
  startsOn: "",
  status: "draft",
  strategyNotes: "",
  targetDistanceM: "",
  targetScore: "",
  weeks: [blankWeek()],
});

export const planToFormState = (
  plan: SeasonTrainingPlan
): TrainingPlanFormState => ({
  athleteId: plan.athleteId,
  endsOn: plan.endsOn,
  events: plan.events.map((event) => ({
    dateStatus: event.dateStatus,
    endsOn: event.endsOn ?? "",
    id: event.id,
    location: event.location,
    name: event.name,
    notes: event.notes,
    priority: event.priority,
    startsOn: event.startsOn ?? "",
  })),
  name: plan.name,
  startsOn: plan.startsOn,
  status: plan.status,
  strategyNotes: plan.strategyNotes,
  targetDistanceM: String(plan.targetDistanceM ?? ""),
  targetScore: String(plan.targetScore ?? ""),
  weeks: plan.weeks.map((week) => ({
    arrowsPlanned: String(week.arrowsPlanned),
    id: week.id,
    technicalFocus: week.technicalFocus,
    trainingDaysPlanned: String(week.trainingDaysPlanned),
    weekStart: week.weekStart,
  })),
});

export const parseNumber = (value: string) => {
  if (!value.trim()) {
    return;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

/** Adds seven days to an ISO date without pulling in a timezone. */
export const nextWeekStart = (weekStart: string) => {
  if (!weekStart) {
    return "";
  }
  const date = new Date(`${weekStart}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
};
