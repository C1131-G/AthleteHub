"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAthletes } from "@/features/athlete/use-athletes";

import { findPreviousAssessment } from "../conditioning-calculations";
import type {
  ConditioningAssessment,
  ConditioningUnit,
} from "../conditioning-types";
import { useConditioning } from "../use-conditioning";
import { ResultComparisonChart, TestTrendChart } from "./conditioning-charts";
import type { ComparisonRow } from "./conditioning-charts";

const unitName = (unit: ConditioningUnit, customUnit?: string) =>
  unit === "custom" ? customUnit || "custom" : unit;

/**
 * Progress tab: one selected test over time, plus previous-versus-current
 * comparisons for the selected athlete's latest assessment.
 */
export const ProgressPanel = ({ athleteId }: { athleteId: string }) => {
  const { athletes } = useAthletes();
  const { assessments } = useConditioning();
  const athleteAssessments = useMemo(
    () =>
      assessments
        .filter((assessment) => assessment.athleteId === athleteId)
        .toSorted((a, b) => a.assessedOn.localeCompare(b.assessedOn)),
    [assessments, athleteId]
  );
  const testOptions = useMemo(() => {
    const latest = athleteAssessments.at(-1);
    if (!latest) {
      return [];
    }
    return latest.results.map((result) => ({
      customUnit: result.customUnit,
      improvementDirection: result.improvementDirection,
      key: result.key,
      label: result.label,
      unit: result.unit,
    }));
  }, [athleteAssessments]);
  const [selectedKey, setSelectedKey] = useState("");
  const selected =
    testOptions.find((option) => option.key === selectedKey) ?? testOptions[0];

  const trendPoints = useMemo(() => {
    if (!selected) {
      return [];
    }
    const points: { assessedOn: string; id: string; value: number }[] = [];
    for (const assessment of athleteAssessments) {
      const result = assessment.results.find(
        (candidate) =>
          candidate.key === selected.key && candidate.unit === selected.unit
      );
      if (result) {
        points.push({
          assessedOn: assessment.assessedOn,
          id: `${assessment.id}-${selected.key}`,
          value: result.value,
        });
      }
    }
    return points;
  }, [athleteAssessments, selected]);

  if (!athleteId) {
    return (
      <p className="text-muted-foreground text-sm">
        Select an athlete above to see conditioning progress.
      </p>
    );
  }
  const athlete = athletes.find((candidate) => candidate.id === athleteId);
  const latest = athleteAssessments.at(-1);
  if (!latest) {
    return (
      <p className="text-muted-foreground text-sm">
        No assessments recorded for {athlete?.fullName ?? "this athlete"} yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ComparisonSection
        assessments={assessments}
        latest={latest}
        athleteName={athlete?.fullName ?? "Athlete"}
      />
      {selected ? (
        <div className="space-y-3">
          <div className="max-w-sm">
            <Label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="progress-test"
            >
              Test trend
            </Label>
            <Select
              onValueChange={(value) => setSelectedKey(value ?? "")}
              value={selected.key}
            >
              <SelectTrigger className="w-full" id="progress-test">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {testOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TestTrendChart
            formatAsDuration={selected.unit === "seconds"}
            label={selected.label}
            points={trendPoints}
            unit={unitName(selected.unit, selected.customUnit)}
          />
        </div>
      ) : null}
    </div>
  );
};

/**
 * One comparison chart per unit family. Repetitions, seconds, kilograms, and
 * scores are never drawn on a shared scale.
 */
const ComparisonSection = ({
  assessments,
  latest,
  athleteName,
}: {
  assessments: ConditioningAssessment[];
  athleteName: string;
  latest: ConditioningAssessment;
}) => {
  const rowsByUnit = useMemo(() => {
    const previous = findPreviousAssessment(assessments, latest);
    const grouped = new Map<string, ComparisonRow[]>();
    for (const result of latest.results) {
      const unit = unitName(result.unit, result.customUnit);
      const rows = grouped.get(unit) ?? [];
      rows.push({
        id: `${result.id}-current`,
        label: result.label,
        series: "current",
        unit,
        value: result.value,
      });
      const prior = previous?.results.find(
        (candidate) =>
          candidate.key === result.key && candidate.unit === result.unit
      );
      if (prior) {
        rows.push({
          id: `${result.id}-previous`,
          label: result.label,
          series: "previous",
          unit,
          value: prior.value,
        });
      }
      grouped.set(unit, rows);
    }
    return [...grouped.entries()];
  }, [assessments, latest]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {rowsByUnit.map(([unit, rows]) => (
        <ResultComparisonChart
          key={unit}
          rows={rows}
          title={`${athleteName} — previous versus current`}
          unit={unit}
        />
      ))}
    </div>
  );
};
