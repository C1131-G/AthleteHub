"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAthletes } from "@/features/athlete/use-athletes";

import { performanceRows } from "../performance-calculations";
import { useReports } from "../use-reports";

const today = new Date();
const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 2, 1)
  .toISOString()
  .slice(0, 10);
const defaultTo = today.toISOString().slice(0, 10);

export const PerformanceWorkspace = () => {
  const { athletes, ready: athletesReady } = useAthletes();
  const { listWeekly, ready: reportsReady } = useReports();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [selected, setSelected] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const rows = useMemo(
    () => performanceRows(athletes, listWeekly, from, to),
    [athletes, listWeekly, from, to]
  );
  const compared = rows.filter((row) => selectedSet.has(row.athleteId));
  const visible = selected.length ? compared : rows;
  const max = Math.max(...visible.map((row) => row.average), 1);
  if (!athletesReady || !reportsReady) {
    return <p aria-live="polite">Loading performance data…</p>;
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compare athletes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="performance-from">From</Label>
              <input
                className="border-input bg-background mt-1 h-10 w-full rounded-md border px-3"
                id="performance-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="performance-to">To</Label>
              <input
                className="border-input bg-background mt-1 h-10 w-full rounded-md border px-3"
                id="performance-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              Athletes (select up to six)
            </legend>
            <div className="flex flex-wrap gap-3">
              {athletes.map((athlete) => (
                <label
                  className="flex items-center gap-2 text-sm"
                  key={athlete.id}
                >
                  <input
                    checked={selectedSet.has(athlete.id)}
                    disabled={
                      !selectedSet.has(athlete.id) && selected.length >= 6
                    }
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, athlete.id]
                          : current.filter((id) => id !== athlete.id)
                      )
                    }
                    type="checkbox"
                  />
                  {athlete.fullName}
                </label>
              ))}
            </div>
          </fieldset>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Average score per arrow</CardTitle>
        </CardHeader>
        <CardContent>
          {visible.length ? (
            <figure
              aria-label="Average score per arrow by athlete"
              className="space-y-4"
            >
              {visible.map((row) => (
                <div key={row.athleteId}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{row.athleteName}</span>
                    <strong>{row.average.toFixed(2)}</strong>
                  </div>
                  <div className="bg-muted h-3 overflow-hidden rounded">
                    <div
                      aria-hidden="true"
                      className="bg-primary h-full rounded"
                      style={{
                        width: `${Math.min(100, (row.average / max) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </figure>
          ) : (
            <p>No athletes match this period.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Performance detail</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table>
            <caption className="sr-only">Performance comparison</caption>
            <thead>
              <tr>
                <th className="p-2 text-left" scope="col">
                  Athlete
                </th>
                <th className="p-2 text-left" scope="col">
                  Average
                </th>
                <th className="p-2 text-left" scope="col">
                  Best session
                </th>
                <th className="p-2 text-left" scope="col">
                  Arrows
                </th>
                <th className="p-2 text-left" scope="col">
                  Sessions
                </th>
                <th className="p-2 text-left" scope="col">
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr className="border-t" key={row.athleteId}>
                  <th className="p-2 text-left font-medium" scope="row">
                    {row.athleteName}
                  </th>
                  <td className="p-2">{row.average.toFixed(2)}</td>
                  <td className="p-2">{row.best.toFixed(2)}</td>
                  <td className="p-2">{row.arrows}</td>
                  <td className="p-2">{row.sessions}</td>
                  <td className="p-2">
                    {row.change === undefined
                      ? "Insufficient data"
                      : `${row.change >= 0 ? "+" : ""}${row.change.toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
