"use client";

import { barY, defineChart, group, lineY } from "@tanstack/charts";
import { Chart } from "@tanstack/charts/react";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scalePoint } from "@tanstack/charts/scales/point";
import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ChartEmpty, ChartLegend, DataTable } from "./chart-parts";

interface ScorePoint {
  label: string;
  value: number;
}

interface LoadPoint {
  label: string;
  planned: number;
  /** `undefined` means the week is planned but no report exists yet. */
  shot: number | undefined;
}

export interface ScoreSeries {
  distanceM: number;
  points: ScorePoint[];
}

const chartOptions = {
  focus: "group-x" as const,
  keyboard: true,
};

const seriesColor = (index: number) => `var(--chart-${(index % 5) + 1})`;

export const ScoreTrendChart = ({
  month,
  series,
}: {
  month: string;
  series: ScoreSeries[];
}) => {
  const definition = useMemo(
    () =>
      defineChart(
        {
          marks: series.map((entry, index) =>
            lineY(
              // A stable id per point so redraws retarget geometry by identity
              // instead of by list position.
              entry.points.map((point) => ({
                ...point,
                id: `${entry.distanceM}-${point.label}`,
              })),
              {
                key: "id",
                points: true,
                stroke: () => seriesColor(index),
                x: "label",
                y: "value",
              }
            )
          ),
          scales: {
            x: { scale: scalePoint },
            y: {
              axis: { label: "Average score (points)" },
              scale: scaleLinear,
            },
          },
        },
        chartOptions
      ),
    [series]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score trend</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length ? (
          <>
            <Chart
              ariaLabel={`Weekly average score per round by shooting distance${month ? ` for ${month}` : ""}, one line per distance in points`}
              definition={definition}
              height={240}
            />
            <ChartLegend
              series={series.map((entry, index) => ({
                color: seriesColor(index),
                label: `${entry.distanceM} m`,
              }))}
            />
            <DataTable
              headers={["Week", "Distance", "Average score (points)"]}
              rows={series.flatMap((entry) =>
                entry.points.map((point) => [
                  point.label,
                  `${entry.distanceM} m`,
                  point.value.toFixed(2),
                ])
              )}
            />
          </>
        ) : (
          <ChartEmpty label="Add weekly scores to see a trend." />
        )}
      </CardContent>
    </Card>
  );
};

export const ArrowLoadChart = ({ points }: { points: LoadPoint[] }) => {
  const chartRows = useMemo(
    () =>
      points.flatMap((point) => {
        const planned = {
          id: `${point.label}-planned`,
          label: point.label,
          series: "planned",
          value: point.planned,
        };
        // A planned week with no report contributes no shot bar, so the gap in
        // the chart matches the "Not recorded" row in the table below it.
        return point.shot === undefined
          ? [planned]
          : [
              planned,
              {
                id: `${point.label}-shot`,
                label: point.label,
                series: "shot",
                value: point.shot,
              },
            ];
      }),
    [points]
  );
  const definition = useMemo(
    () =>
      defineChart(
        {
          marks: [
            barY(chartRows, {
              color: "series",
              fill: (row) =>
                row.series === "planned" ? "var(--chart-2)" : "var(--chart-1)",
              key: "id",
              // Planned and shot sit side by side; stacking them would read as
              // a single total rather than a comparison.
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
    [chartRows]
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
              headers={["Week", "Planned (arrows)", "Shot (arrows)"]}
              rows={points.map((point) => [
                point.label,
                String(point.planned),
                point.shot === undefined ? "Not recorded" : String(point.shot),
              ])}
            />
          </>
        ) : (
          <ChartEmpty label="Add weekly load values to see progress." />
        )}
      </CardContent>
    </Card>
  );
};
