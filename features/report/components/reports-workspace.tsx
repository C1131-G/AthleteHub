"use client";
// Filters and three report modes are intentionally co-located at this client boundary.
// oxlint-disable complexity, no-nested-ternary

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
import { Label } from "@/components/ui/label";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssessmentTable } from "@/features/assessment/assessment-table";
import {
  assessmentTypeLabel,
  assessmentTypes,
} from "@/features/assessment/assessment-types";
import { useAssessments } from "@/features/assessment/use-assessments";
import { useAthletes } from "@/features/athlete/use-athletes";

import { useReports } from "../use-reports";
import { MonthlyReportTable } from "./monthly-report-table";
import { PerformanceWorkspace } from "./performance-workspace";
import { ReportActions } from "./report-actions";
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

const labelClass = "mb-1.5";

const csvCell = (value: string | number) => {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export const ReportsWorkspace = () => {
  const router = useRouter();
  const params = useSearchParams();
  const { athletes, ready: athletesReady } = useAthletes();
  const { listMonthly, listWeekly, ready: reportsReady } = useReports();
  const { assessments, ready: assessmentsReady } = useAssessments();
  const [query, setQuery] = useState("");
  const tab =
    params.get("tab") === "monthly" ||
    params.get("tab") === "assessments" ||
    params.get("tab") === "performance"
      ? params.get("tab")
      : "weekly";
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
  const assessmentRows = assessments.filter(
    (record) =>
      (!athleteId || record.athleteId === athleteId) &&
      (!month || record.assessedOn.startsWith(month)) &&
      (!query || matches(record.athleteId, query)) &&
      (!params.get("assessmentType") ||
        record.assessmentType === params.get("assessmentType"))
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
    replaceParams(new URLSearchParams({ tab: tab ?? "weekly" }));
  };
  const hasFilters = Boolean(athleteId || month || status || query);
  const exportContent = [
    ["Athlete", "Date", "Status", "Type"].map(csvCell).join(","),
    ...weeklyRows.map((row) =>
      [
        athleteById.get(row.athleteId)?.fullName ?? "Unknown athlete",
        row.weekStart,
        row.status,
        "Weekly report",
      ]
        .map(csvCell)
        .join(",")
    ),
    ...monthlyRows.map((row) =>
      [
        athleteById.get(row.athleteId)?.fullName ?? "Unknown athlete",
        row.month,
        row.status,
        "Monthly report",
      ]
        .map(csvCell)
        .join(",")
    ),
  ].join("\n");

  if (!(athletesReady && reportsReady && assessmentsReady)) {
    return <ReportsWorkspaceSkeleton />;
  }

  return (
    <section aria-labelledby="reports-title" className="space-y-6">
      <ReportActions
        content={exportContent}
        summary="AthleteHub performance report. Open the app for the full selected tables and charts."
        title="AthleteHub performance report"
      />
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
            <Label className={labelClass} htmlFor="report-search">
              Search athlete
            </Label>
            <Input
              id="report-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or athlete ID"
              value={query}
            />
          </div>
          {tab === "assessments" ? (
            <div>
              <Label className={labelClass} htmlFor="report-assessment-type">
                Assessment type
              </Label>
              <Select
                onValueChange={(value) =>
                  setFilter("assessmentType", value ?? ALL)
                }
                value={params.get("assessmentType") ?? ALL}
              >
                <SelectTrigger className="w-full" id="report-assessment-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All types</SelectItem>
                  {assessmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {assessmentTypeLabel[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div>
            <Label className={labelClass} htmlFor="report-athlete">
              Athlete
            </Label>
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
            <Label className={labelClass} htmlFor="report-month">
              Month
            </Label>
            <MonthPicker
              id="report-month"
              onChange={(value) => setFilter("month", value)}
              value={month}
            />
          </div>
          <div>
            <Label className={labelClass} htmlFor="report-status">
              Status
            </Label>
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
          <TabsTrigger value="assessments">
            Assessments ({assessmentRows.length})
          </TabsTrigger>
          <TabsTrigger value="performance">Compare athletes</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "performance" ? (
        <PerformanceWorkspace />
      ) : tab === "weekly" ? (
        <WeeklyReportTable athleteById={athleteById} rows={weeklyRows} />
      ) : tab === "monthly" ? (
        <MonthlyReportTable
          athleteById={athleteById}
          month={month}
          rows={monthlyRows}
        />
      ) : (
        <AssessmentTable athleteById={athleteById} rows={assessmentRows} />
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
