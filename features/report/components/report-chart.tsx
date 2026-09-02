"use client";

import { barX, barY, defineChart, lineY } from "@tanstack/charts";
import { pie, polar, radialArc } from "@tanstack/charts/polar";
import { Chart } from "@tanstack/charts/react";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ChartCard, ChartLegend, DataTable } from "./chart-parts";

interface ScorePoint {
  label: string;
  value: number;
}

interface LoadPoint {
  label: string;
  planned: number;
  shot: number;
}

export interface RankingPoint {
  label: string;
  value: number;
}
export interface CompletionPoint {
  label: string;
  value: number;
}

const chartOptions = {
  focus: "group-x" as const,
  keyboard: true,
};

export const ScoreTrendChart = ({ points }: { points: ScorePoint[] }) => {
  const definition = defineChart(
    {
      marks: [
        lineY(points, {
          points: true,
          stroke: () => "var(--chart-1)",
          x: "label",
          y: "value",
        }),
      ],
      scales: {
        x: { scale: scalePoint },
        y: { scale: scaleLinear },
      },
    },
    chartOptions
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score trend</CardTitle>
      </CardHeader>
      <CardContent>
        {points.length ? (
          <>
            <Chart
              ariaLabel="Monthly average score trend"
              definition={definition}
              height={240}
            />
            <DataTable
              headers={["Session", "Average"]}
              rows={points.map((point) => [
                point.label,
                point.value.toFixed(2),
              ])}
            />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Add weekly scores to see a trend.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const ArrowLoadChart = ({ points }: { points: LoadPoint[] }) => {
  const chartRows = points.flatMap((point) => [
    { label: point.label, series: "planned", value: point.planned },
    { label: point.label, series: "shot", value: point.shot },
  ]);
  const definition = defineChart(
    {
      marks: [
        barY(chartRows, {
          color: "series",
          fill: (row) =>
            row.series === "planned" ? "var(--chart-2)" : "var(--chart-1)",
          x: "label",
          y: "value",
          z: "series",
        }),
      ],
      scales: {
        x: { scale: scalePoint },
        y: { scale: scaleLinear },
      },
    },
    chartOptions
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Arrow load</CardTitle>
      </CardHeader>
      <CardContent>
        {points.length ? (
          <>
            <Chart
              ariaLabel="Planned and shot arrows by week"
              definition={definition}
              height={240}
            />
            <ChartLegend
              series={[
                { color: "var(--chart-1)", label: "Shot" },
                { color: "var(--chart-2)", label: "Planned" },
              ]}
            />
            <DataTable
              headers={["Week / series", "Arrows"]}
              rows={chartRows.map((row) => [
                `${row.label} / ${row.series}`,
                String(row.value),
              ])}
            />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Add weekly load values to see progress.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const AthleteRankingChart = ({
  points,
  distanceM,
}: {
  points: RankingPoint[];
  distanceM: number;
}) => {
  const definition = defineChart(
    {
      marks: [
        barX(points, {
          fill: () => "var(--chart-1)",
          x: "value",
          y: "label",
        }),
      ],
      scales: { x: { scale: scaleLinear }, y: { scale: scalePoint } },
    },
    chartOptions
  );
  return (
    <ChartCard
      title={`Athlete ranking at ${distanceM} m`}
      label="Athlete ranking by average score"
    >
      <Chart
        definition={definition}
        ariaLabel="Athlete ranking by average score"
        height={240}
      />
      {points.length > 0 && (
        <DataTable
          headers={["Athlete", "Average"]}
          rows={points.map((point) => [point.label, point.value.toFixed(2)])}
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
  const slices = pie(points, { value: "value" });
  const definition = defineChart(
    {
      color: {
        domain: points.map((point) => point.label),
        range: ["var(--chart-1)", "var(--chart-3)", "var(--chart-5)"],
      },
      marks: [
        polar({
          inset: 8,
          marks: [
            radialArc(slices, {
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
  );
  return (
    <ChartCard
      title="Monthly report completion"
      label="Complete, draft, and missing monthly reports"
    >
      <Chart
        definition={definition}
        ariaLabel="Monthly report completion"
        height={240}
      />
      {points.length > 0 && (
        <ChartLegend
          series={points.map((point, index) => ({
            color: `var(--chart-${[1, 3, 5][index] ?? 1})`,
            label: point.label,
          }))}
        />
      )}
      {points.length > 0 && (
        <DataTable
          headers={["Status", "Reports"]}
          rows={points.map((point) => [point.label, String(point.value)])}
        />
      )}
    </ChartCard>
  );
};
