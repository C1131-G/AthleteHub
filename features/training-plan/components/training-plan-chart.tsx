"use client";

import { barY, defineChart, group, lineY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { useMemo } from "react";

import {
  ChartCard,
  ChartEmpty,
  ChartLegend,
  DataTable,
} from "@/features/report/chart-parts";

import type { PlanWeekProgress } from "../training-plan-calculations";
import { formatVariance } from "../training-plan-format";

const chartOptions = {
  focus: "group-x" as const,
  keyboard: true,
};

const weekLabel = (weekStart: string) => weekStart.slice(5);

export const PlannedVersusActualChart = ({
  progress,
}: {
  progress: PlanWeekProgress[];
}) => {
  const rows = useMemo(
    () =>
      progress.flatMap((week) => {
        const planned = {
          id: `${week.weekStart}-planned`,
          label: weekLabel(week.weekStart),
          series: "Planned",
          value: week.plannedArrows,
        };
        // A week with no report contributes no actual bar, so the gap in the
        // chart matches the "Not recorded" row in the table below it.
        return week.actualArrows === undefined
          ? [planned]
          : [
              planned,
              {
                id: `${week.weekStart}-actual`,
                label: weekLabel(week.weekStart),
                series: "Actual",
                value: week.actualArrows,
              },
            ];
      }),
    [progress]
  );
  const definition = useMemo(
    () =>
      defineChart(
        {
          marks: [
            barY(rows, {
              color: "series",
              fill: (row) =>
                row.series === "Planned" ? "var(--chart-2)" : "var(--chart-1)",
              key: "id",
              // Planned and actual sit side by side; stacking them would read
              // as a single total rather than a comparison.
              layout: group(),
              x: "label",
              y: "value",
              z: "series",
            }),
          ],
          scales: {
            x: { scale: scaleBand },
            y: { axis: { label: "Arrows" }, scale: scaleLinear },
          },
        },
        chartOptions
      ),
    [rows]
  );

  return (
    <ChartCard
      label="Planned and actual arrows for each planned week"
      title="Planned versus actual arrows"
    >
      {progress.length ? (
        <>
          <Chart
            ariaLabel="Planned and actual arrows by week, in arrows"
            definition={definition}
            height={240}
          />
          <ChartLegend
            series={[
              { color: "var(--chart-2)", label: "Planned" },
              { color: "var(--chart-1)", label: "Actual" },
            ]}
          />
          <DataTable
            headers={[
              "Week",
              "Planned (arrows)",
              "Actual (arrows)",
              "Variance",
            ]}
            rows={progress.map((week) => [
              week.weekStart,
              String(week.plannedArrows),
              week.actualArrows === undefined
                ? "Not recorded"
                : String(week.actualArrows),
              formatVariance(week.variance),
            ])}
          />
        </>
      ) : (
        <ChartEmpty label="Add planned weeks to compare load." />
      )}
    </ChartCard>
  );
};

export const WeeklyTargetChart = ({
  progress,
}: {
  progress: PlanWeekProgress[];
}) => {
  const points = useMemo(
    () =>
      progress.map((week) => ({
        id: week.weekStart,
        label: weekLabel(week.weekStart),
        value: week.plannedArrows,
      })),
    [progress]
  );
  const definition = useMemo(
    () =>
      defineChart(
        {
          marks: [
            lineY(points, {
              key: "id",
              points: true,
              stroke: () => "var(--chart-3)",
              x: "label",
              y: "value",
            }),
          ],
          scales: {
            x: { scale: scalePoint },
            y: {
              axis: { label: "Weekly target (arrows)" },
              scale: scaleLinear,
            },
          },
        },
        chartOptions
      ),
    [points]
  );

  return (
    <ChartCard
      label="Weekly arrow target across the season"
      title="Weekly target progression"
    >
      {points.length ? (
        <>
          <Chart
            ariaLabel="Weekly arrow target across the season, in arrows"
            definition={definition}
            height={240}
          />
          <DataTable
            headers={[
              "Week",
              "Weekly target (arrows)",
              "Training days",
              "Per training day (arrows)",
            ]}
            rows={progress.map((week) => [
              week.weekStart,
              String(week.plannedArrows),
              String(week.trainingDaysPlanned),
              String(Math.round(week.arrowsPerTrainingDay)),
            ])}
          />
        </>
      ) : (
        <ChartEmpty label="Add planned weeks to see the progression." />
      )}
    </ChartCard>
  );
};
