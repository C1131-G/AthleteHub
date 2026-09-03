import type { PlanFormErrors } from "./training-plan-form-errors";
import { parseNumber } from "./training-plan-form-state";
import type { TrainingPlanFormState } from "./training-plan-form-state";

const isPositiveInteger = (value: number | undefined) =>
  value !== undefined && Number.isInteger(value) && value > 0;

const validateWeeks = (form: TrainingPlanFormState, errors: PlanFormErrors) => {
  const seen = new Map<string, number>();
  for (const [index, week] of form.weeks.entries()) {
    const startId = `week-${week.id}-start`;
    if (week.weekStart) {
      const firstIndex = seen.get(week.weekStart);
      if (firstIndex === undefined) {
        seen.set(week.weekStart, index);
      } else {
        errors[startId] =
          `This week is already planned as week ${firstIndex + 1}.`;
      }
      if (
        form.startsOn &&
        form.endsOn &&
        (week.weekStart < form.startsOn || week.weekStart > form.endsOn)
      ) {
        errors[startId] = "This week falls outside the season dates.";
      }
    } else {
      errors[startId] = "Choose the week start date.";
    }
    const arrows = parseNumber(week.arrowsPlanned);
    if (!isPositiveInteger(arrows)) {
      errors[`week-${week.id}-arrows`] =
        "Arrows planned must be a whole number above zero.";
    }
    const days = parseNumber(week.trainingDaysPlanned);
    if (days === undefined || !Number.isInteger(days) || days < 1 || days > 7) {
      errors[`week-${week.id}-days`] =
        "Training days must be a whole number from 1 to 7.";
    }
  }
};

const validateEvents = (
  form: TrainingPlanFormState,
  errors: PlanFormErrors
) => {
  for (const event of form.events) {
    if (!event.name.trim()) {
      errors[`event-${event.id}-name`] = "Every event needs a name.";
    }
    if (event.dateStatus !== "scheduled") {
      continue;
    }
    if (!event.startsOn) {
      errors[`event-${event.id}-start`] =
        "A scheduled event needs a start date.";
    }
    if (event.endsOn && event.startsOn && event.endsOn < event.startsOn) {
      errors[`event-${event.id}-end`] =
        "The end date cannot be before the start date.";
    }
  }
};

/**
 * Mirrors the schema so each message can name the control it belongs to. The
 * repository still revalidates; this exists to place errors in the DOM.
 */
export const validateTrainingPlanForm = (
  form: TrainingPlanFormState
): PlanFormErrors => {
  const errors: PlanFormErrors = {};

  if (!form.athleteId) {
    errors["plan-athlete"] = "Select an athlete.";
  }
  if (!form.name.trim()) {
    errors["plan-name"] = "Name the season plan.";
  }
  if (!form.startsOn) {
    errors["plan-starts-on"] = "Choose the season start date.";
  }
  if (!form.endsOn) {
    errors["plan-ends-on"] = "Choose the season end date.";
  }
  if (form.startsOn && form.endsOn && form.endsOn < form.startsOn) {
    errors["plan-ends-on"] =
      "The season end date cannot be before the start date.";
  }
  if (form.weeks.length === 0) {
    errors["plan-weeks"] = "Add at least one planned week.";
  }

  const targetDistanceM = parseNumber(form.targetDistanceM);
  if (form.targetDistanceM.trim() && !isPositiveInteger(targetDistanceM)) {
    errors["plan-target-distance"] =
      "Target distance must be a whole number above zero.";
  }
  const targetScore = parseNumber(form.targetScore);
  if (form.targetScore.trim() && !isPositiveInteger(targetScore)) {
    errors["plan-target-score"] =
      "Target score must be a whole number above zero.";
  }

  validateWeeks(form, errors);
  validateEvents(form, errors);
  return errors;
};
