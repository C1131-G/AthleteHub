"use client";

import { barX, defineChart } from "@tanstack/charts";
import { pie, polar, radialArc } from "@tanstack/charts/polar";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { useMemo } from "react";

import { ChartCard, ChartEmpty, ChartLegend, DataTable } from "./chart-parts";

export interface RankingPoint {
  label: string;
  value: number;
}

export interface CompletionPoint {
  label: string;
  value: number;
}

const chartOptions = { focus: "group-x" as const, keyboard: true };

export const AthleteRankingChart = ({
  points,
  distanceM,
}: {
  points: RankingPoint[];
  distanceM: number;
}) => {
  const definition = useMemo(
    () =>
      defineChart(
        {
          marks: [
            barX(points, {
              fill: () => "var(--chart-1)",
              key: "label",
              x: "value",
              y: "label",
            }),
          ],
          scales: {
            x: {
              axis: { label: "Average score (points)" },
              scale: scaleLinear,
            },
            y: { scale: scalePoint },
          },
        },
        chartOptions
      ),
    [points]
  );
  return (
    <ChartCard
      label="Athlete ranking by average score"
      title={`Athlete ranking at ${distanceM} m`}
    >
      {points.length ? (
        <>
          <Chart
            ariaLabel={`Athlete ranking by average score at ${distanceM} m, in points`}
            definition={definition}
            height={240}
          />
          <DataTable
            headers={["Athlete", "Average score (points)"]}
            rows={points.map((point) => [point.label, point.value.toFixed(2)])}
          />
        </>
      ) : (
        <ChartEmpty
          label={`No scored rounds at ${distanceM} m yet. Add weekly scores at this distance to compare athletes.`}
        />
      )}
    </ChartCard>
  );
};

export const ReportCompletionChart = ({
  points,
}: {
  points: CompletionPoint[];
}) => {
  const definition = useMemo(
    () =>
      defineChart(
        {
          color: {
            domain: points.map((point) => point.label),
            range: ["var(--chart-1)", "var(--chart-3)", "var(--chart-5)"],
          },
          marks: [
            polar({
              inset: 8,
              marks: [
                radialArc(pie(points, { value: "value" }), {
                  color: "label",
                  innerRadius: ({ radius }) => radius * 0.58,
                  key: "label",
                }),
              ],
              radiusRatio: 0.82,
              scales: { angle: null, radius: null },
            }),
          ],
          scales: { x: null, y: null },
        },
        chartOptions
      ),
    [points]
  );
  return (
    <ChartCard
      label="Complete, draft, and missing monthly reports"
      title="Monthly report completion"
    >
      {points.length ? (
        <>
          <Chart
            ariaLabel="Monthly report completion, counted as reports per status"
            definition={definition}
            height={240}
          />
          <ChartLegend
            series={points.map((point, index) => ({
              color: `var(--chart-${[1, 3, 5][index] ?? 1})`,
              label: point.label,
            }))}
          />
          <DataTable
            headers={["Status", "Reports"]}
            rows={points.map((point) => [point.label, String(point.value)])}
          />
        </>
      ) : (
        <ChartEmpty label="No monthly reports for this period yet." />
      )}
    </ChartCard>
  );
};
