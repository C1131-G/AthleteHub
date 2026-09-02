"use client";

import { XIcon } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAthletes } from "@/features/athlete/use-athletes";

import { useReports } from "../use-reports";
import { MonthlyReportTable } from "./monthly-report-table";
import { WeeklyReportTable } from "./weekly-report-table";

const REPORTS_PATH = "/reports";
/** Select cannot hold an empty value, so "all" stands in for "no filter". */
const ALL = "all";

const weeklyStatusOptions = [
  { label: "Completed", value: "completed" },
  { label: "Competition", value: "competition" },
  { label: "Medical leave", value: "medical-leave" },
  { label: "Absent", value: "absent" },
];
const monthlyStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Complete", value: "complete" },
];

const labelClass = "mb-1.5 block text-sm font-medium";

export const ReportsWorkspace = () => {
  const router = useRouter();
  const params = useSearchParams();
  const { athletes, ready: athletesReady } = useAthletes();
  const { listMonthly, listWeekly, ready: reportsReady } = useReports();
  const [query, setQuery] = useState("");
  const tab = params.get("tab") === "monthly" ? "monthly" : "weekly";
  const athleteId = params.get("athleteId") ?? "";
  const month = params.get("month") ?? "";
  const statusOptions =
    tab === "monthly" ? monthlyStatusOptions : weeklyStatusOptions;
  const requestedStatus = params.get("status") ?? "";
  // A status carried over from the other tab can never match, so ignore it.
  const status = statusOptions.some(
    (option) => option.value === requestedStatus
  )
    ? requestedStatus
    : "";
  const statusLabel =
    statusOptions.find((option) => option.value === status)?.label ??
    "All statuses";
  const athleteById = useMemo(
    () => new Map(athletes.map((athlete) => [athlete.id, athlete])),
    [athletes]
  );
  const matches = (id: string, search: string) => {
    const athlete = athleteById.get(id);
    return `${athlete?.fullName ?? ""} ${athlete?.athleteId ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
  };
  const weeklyRows = listWeekly.filter(
    (report) =>
      (!athleteId || report.athleteId === athleteId) &&
      (!month || report.weekStart.startsWith(month)) &&
      (!status || report.status === status) &&
      (!query || matches(report.athleteId, query))
  );
  const monthlyRows = listMonthly.filter(
    (report) =>
      (!athleteId || report.athleteId === athleteId) &&
      (!month || report.month === month) &&
      (!status || report.status === status) &&
      (!query || matches(report.athleteId, query))
  );
  const replaceParams = (next: URLSearchParams) => {
    const search = next.toString();
    router.replace(search ? `${REPORTS_PATH}?${search}` : REPORTS_PATH);
  };
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== ALL) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    replaceParams(next);
  };
  const setTab = (value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", value);
    // Statuses are tab-specific; keeping one across tabs hides every row.
    next.delete("status");
    replaceParams(next);
  };
  const clearFilters = () => {
    setQuery("");
    replaceParams(new URLSearchParams({ tab }));
  };
  const hasFilters = Boolean(athleteId || month || status || query);

  if (!(athletesReady && reportsReady)) {
    return <ReportsWorkspaceSkeleton />;
  }

  return (
    <section aria-labelledby="reports-title" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find reports</CardTitle>
          {hasFilters ? (
            <CardAction>
              <Button onClick={clearFilters} size="sm" variant="ghost">
                <XIcon aria-hidden="true" />
                Clear filters
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className={labelClass} htmlFor="report-search">
              Search athlete
            </label>
            <Input
              id="report-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or athlete ID"
              value={query}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="report-athlete">
              Athlete
            </label>
            <Select
              onValueChange={(value) => setFilter("athleteId", value ?? ALL)}
              value={athleteId || ALL}
            >
              <SelectTrigger className="w-full" id="report-athlete">
                <SelectValue>
                  {athleteById.get(athleteId)?.fullName ?? "All athletes"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All athletes</SelectItem>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={labelClass} htmlFor="report-month">
              Month
            </label>
            <Input
              id="report-month"
              onChange={(event) => setFilter("month", event.target.value)}
              type="month"
              value={month}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="report-status">
              Status
            </label>
            <Select
              onValueChange={(value) => setFilter("status", value ?? ALL)}
              value={status || ALL}
            >
              <SelectTrigger className="w-full" id="report-status">
                <SelectValue>{statusLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Tabs onValueChange={setTab} value={tab}>
        <TabsList aria-label="Report type">
          <TabsTrigger value="weekly">
            Weekly entries ({weeklyRows.length})
          </TabsTrigger>
          <TabsTrigger value="monthly">
            Monthly reports ({monthlyRows.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "weekly" ? (
        <WeeklyReportTable athleteById={athleteById} rows={weeklyRows} />
      ) : (
        <MonthlyReportTable
          athleteById={athleteById}
          month={month}
          rows={monthlyRows}
        />
      )}
    </section>
  );
};

export const ReportsWorkspaceSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-muted h-12 w-80 animate-pulse rounded-xl" />
    <div className="bg-muted h-32 animate-pulse rounded-xl" />
    <div className="bg-muted h-72 animate-pulse rounded-xl" />
  </div>
);
