"use client";

import { barY, defineChart, lineY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartCard,
  ChartEmpty,
  ChartLegend,
  DataTable,
} from "@/features/report/chart-parts";

import { formatDuration } from "../conditioning-calculations";
import type { SessionIntensity } from "../conditioning-types";
import { intensityLabel } from "../conditioning-types";

const chartOptions = {
  focus: "group-x" as const,
  keyboard: true,
};

export interface ComparisonRow {
  id: string;
  label: string;
  /** "previous" or "current" — one bar per series per test. */
  series: string;
  unit: string;
  value: number;
}

/**
 * Previous-versus-current bars for one unit family. Repetitions, seconds,
 * kilograms, and scores are never drawn on one scale, so the caller groups
 * rows by unit and renders one comparison chart per unit.
 */
export const ResultComparisonChart = ({
  rows,
  unit,
  title,
}: {
  rows: ComparisonRow[];
  title: string;
  unit: string;
}) => {
  const definition = useMemo(
    () =>
      defineChart(
        {
          marks: [
            barY(rows, {
              color: "series",
              fill: (row) =>
                row.series === "previous" ? "var(--chart-3)" : "var(--chart-1)",
              key: "id",
              x: "label",
              y: "value",
              z: "series",
            }),
          ],
          scales: {
            x: { scale: scalePoint },
            y: { axis: { label: `Value (${unit})` }, scale: scaleLinear },
          },
        },
        chartOptions
      ),
    [rows, unit]
  );

  return (
    <ChartCard label={`${title} (${unit})`} title={title}>
      <Chart
        ariaLabel={`${title}, previous versus current values in ${unit}`}
        definition={definition}
        height={240}
      />
      <ChartLegend
        series={[
          { color: "var(--chart-1)", label: "Current" },
          { color: "var(--chart-3)", label: "Previous" },
        ]}
      />
      <DataTable
        headers={["Test", "Previous", "Current", "Unit"]}
        rows={[...new Set(rows.map((row) => row.label))].map((label) => {
          const forLabel = rows.filter((row) => row.label === label);
          const previous = forLabel.find((row) => row.series === "previous");
          const current = forLabel.find((row) => row.series === "current");
          return [
            label,
            previous ? String(previous.value) : "—",
            current ? String(current.value) : "—",
            unit,
          ];
        })}
      />
    </ChartCard>
  );
};

export interface TrendPoint {
  assessedOn: string;
  id: string;
  value: number;
}

export const TestTrendChart = ({
  label,
  points,
  unit,
  formatAsDuration,
}: {
  formatAsDuration: boolean;
  label: string;
  points: TrendPoint[];
  unit: string;
}) => {
  const definition = useMemo(
    () =>
      defineChart(
        {
          marks: [
            lineY(points, {
              key: "id",
              points: true,
              stroke: () => "var(--chart-1)",
              x: "assessedOn",
              y: "value",
            }),
          ],
          scales: {
            x: { scale: scalePoint },
            y: {
              axis: { label: `Value (${unit})` },
              scale: scaleLinear,
            },
          },
        },
        chartOptions
      ),
    [points, unit]
  );
  const formatValue = (value: number) =>
    formatAsDuration ? formatDuration(value) : String(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{label} trend</CardTitle>
      </CardHeader>
      <CardContent>
        {points.length ? (
          <>
            <Chart
              ariaLabel={`${label} results over time in ${unit}`}
              definition={definition}
              height={240}
            />
            <DataTable
              headers={["Assessed on", `${label} (${unit})`]}
              rows={points.map((point) => [
                point.assessedOn,
                formatValue(point.value),
              ])}
            />
          </>
        ) : (
          <ChartEmpty label="Record this test on two or more assessments to see a trend." />
        )}
      </CardContent>
    </Card>
  );
};

export interface MinutesRow {
  id: string;
  intensity: SessionIntensity;
  minutes: number;
}

export const WeeklyMinutesChart = ({ rows }: { rows: MinutesRow[] }) => {
  const definition = useMemo(
    () =>
      defineChart(
        {
          marks: [
            barY(rows, {
              fill: (row) =>
                `var(--chart-${["recovery", "low", "moderate", "high"].indexOf(row.intensity) + 1 || 1})`,
              key: "id",
              x: "intensity",
              y: "minutes",
            }),
          ],
          scales: {
            x: { scale: scalePoint },
            y: { axis: { label: "Minutes per week" }, scale: scaleLinear },
          },
        },
        chartOptions
      ),
    [rows]
  );

  return (
    <ChartCard
      label="Weekly training minutes by intensity"
      title="Weekly minutes by intensity"
    >
      {rows.length ? (
        <>
          <Chart
            ariaLabel="Planned training minutes per week grouped by session intensity"
            definition={definition}
            height={240}
          />
          <DataTable
            headers={["Intensity", "Minutes per week"]}
            rows={rows.map((row) => [
              intensityLabel[row.intensity],
              String(row.minutes),
            ])}
          />
        </>
      ) : (
        <ChartEmpty label="Add timed sessions to the programme schedule." />
      )}
    </ChartCard>
  );
};
