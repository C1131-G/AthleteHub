import type { EquipmentSetup } from "@/features/equipment/equipment-types";

import type { WeeklyPerformanceReport } from "./report-types";

export const latestSetup = (setups: EquipmentSetup[]) =>
  setups.toSorted((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];

export const openRequirementCount = (setup: EquipmentSetup | undefined) =>
  setup?.items.filter((item) => item.requirement.trim() && !item.value.trim())
    .length ?? 0;

export const averageOf = (values: number[]) =>
  values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;

export const byDistance = (reports: WeeklyPerformanceReport[]) => {
  const grouped = new Map<number, WeeklyPerformanceReport[]>();
  for (const report of reports) {
    if (!(report.distanceM && report.scores.length)) {
      continue;
    }
    grouped.set(report.distanceM, [
      ...(grouped.get(report.distanceM) ?? []),
      report,
    ]);
  }
  return grouped;
};

export const scoreChangesFor = (reports: WeeklyPerformanceReport[]) => {
  const deltas: number[] = [];
  for (const group of byDistance(reports).values()) {
    const sorted = group.toSorted((a, b) =>
      a.weekStart.localeCompare(b.weekStart)
    );
    const [first] = sorted;
    const last = sorted.at(-1);
    if (first && last && first !== last) {
      deltas.push(averageOf(last.scores) - averageOf(first.scores));
    }
  }
  return deltas;
};
