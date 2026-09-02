"use client";

import { PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MonthlyReportTable, WeeklyReportTable } from "./report-tables";

const REPORTS_PATH = "/reports";

export const ReportsWorkspace = () => {
  const router = useRouter();
  const params = useSearchParams();
  const { athletes, ready: athletesReady } = useAthletes();
  const { listMonthly, listWeekly, ready: reportsReady } = useReports();
  const [query, setQuery] = useState("");
  const tab = params.get("tab") === "monthly" ? "monthly" : "weekly";
  const athleteId = params.get("athleteId") ?? "";
  const month = params.get("month") ?? "";
  const status = params.get("status") ?? "";
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
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    router.replace(`${REPORTS_PATH}?${next.toString()}`);
  };
  if (!athletesReady || !reportsReady) {
    return <ReportsWorkspaceSkeleton />;
  }
  return (
    <section className="space-y-6" aria-labelledby="reports-title">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 id="reports-title" className="text-3xl font-semibold">
            Performance reports
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter weekly scores and review monthly coaching reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/reports/monthly/new"
          >
            <PlusIcon /> Monthly report
          </Link>
          <Link className={buttonVariants()} href="/reports/weekly/new">
            <PlusIcon /> Weekly entry
          </Link>
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Find reports</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="text-sm font-medium" htmlFor="report-search">
              Search athlete
            </label>
            <Input
              id="report-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or athlete ID"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="report-athlete">
              Athlete
            </label>
            <Select
              value={athleteId}
              onValueChange={(value) => setFilter("athleteId", value ?? "")}
            >
              <SelectTrigger id="report-athlete" className="w-full">
                <SelectValue placeholder="All athletes" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="report-month">
              Month
            </label>
            <Input
              id="report-month"
              type="month"
              value={month}
              onChange={(event) => setFilter("month", event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="report-status">
              Status
            </label>
            <Select
              value={status}
              onValueChange={(value) => setFilter("status", value ?? "")}
            >
              <SelectTrigger id="report-status" className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="competition">Competition</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Tabs value={tab} onValueChange={(value) => setFilter("tab", value)}>
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
        <WeeklyReportTable rows={weeklyRows} athleteById={athleteById} />
      ) : (
        <MonthlyReportTable
          rows={monthlyRows}
          athleteById={athleteById}
          month={month}
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
