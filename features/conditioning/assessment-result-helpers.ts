import { formatDuration } from "./conditioning-calculations";
import type { ConditioningAssessment } from "./conditioning-types";

export const unitSuffix = (
  result: ConditioningAssessment["results"][number]
) => (result.unit === "custom" ? result.customUnit || "units" : result.unit);

export const formatValue = (
  value: number,
  result: ConditioningAssessment["results"][number]
) =>
  result.unit === "seconds"
    ? formatDuration(value)
    : `${value} ${unitSuffix(result)}`;

export const changeDirection = (
  result: ConditioningAssessment["results"][number],
  prior: ConditioningAssessment["results"][number] | undefined
): "better" | "worse" | "same" => {
  if (!prior) {
    return "same";
  }
  const delta = result.value - prior.value;
  if (delta === 0) {
    return "same";
  }
  const improved =
    result.improvementDirection === "higher" ? delta > 0 : delta < 0;
  return improved ? "better" : "worse";
};
