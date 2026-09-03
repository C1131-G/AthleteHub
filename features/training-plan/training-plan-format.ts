import { formatDate } from "@/lib/format";

import type { SeasonTrainingPlan } from "./training-plan-types";

// Hoisted so the formatter is built once rather than on every render.
const numberFormat = new Intl.NumberFormat("en");

export const seasonRange = (plan: SeasonTrainingPlan) =>
  `${formatDate(plan.startsOn)} – ${formatDate(plan.endsOn)}`;

export const formatArrows = (value: number) =>
  `${numberFormat.format(value)} arrows`;

export const formatVariance = (variance: number | undefined) => {
  if (variance === undefined) {
    return "Not recorded";
  }
  const sign = variance > 0 ? "+" : "";
  return `${sign}${numberFormat.format(variance)}`;
};

export const seasonTargetLabel = (plan: SeasonTrainingPlan) => {
  if (plan.targetScore && plan.targetDistanceM) {
    return `${plan.targetScore} at ${plan.targetDistanceM} m`;
  }
  if (plan.targetScore) {
    return `${plan.targetScore} points`;
  }
  if (plan.targetDistanceM) {
    return `${plan.targetDistanceM} m`;
  }
  return "Not set";
};
