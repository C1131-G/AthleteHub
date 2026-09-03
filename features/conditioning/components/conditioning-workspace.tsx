"use client";

import { XIcon } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { AthletePicker } from "@/features/athlete/athlete-picker";
import { useAthletes } from "@/features/athlete/use-athletes";

import { assessmentStatusLabel, phaseLabel } from "../conditioning-types";
import { useConditioning } from "../use-conditioning";
import { AssessmentTable } from "./assessment-table";
import { ProgrammeTable } from "./programme-table";
import { ProgressPanel } from "./progress-panel";

const CONDITIONING_PATH = "/conditioning";
/** Select cannot hold an empty value, so "all" stands in for "no filter". */
const ALL = "all";

const tabs = ["assessments", "programmes", "progress"] as const;
type Tab = (typeof tabs)[number];

// SAFETY: Object.entries preserves the label map's exact key union.
const assessmentStatusOptions = (
  Object.entries(assessmentStatusLabel) as [
    keyof typeof assessmentStatusLabel,
    string,
  ][]
).map(([value, label]) => ({ label, value }));

// SAFETY: Object.entries preserves the label map's exact key union.
const phaseOptions = (
  Object.entries(phaseLabel) as [keyof typeof phaseLabel, string][]
).map(([value, label]) => ({ label, value }));

const programmeStatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

const labelClass = "mb-1.5";

interface WorkspaceFilters {
  assessmentStatus: string;
  athleteId: string;
  month: string;
  phase: string;
  programmeStatus: string;
}

const matchesAssessment = (
  assessment: { assessedOn: string; athleteId: string; status: string },
  filters: WorkspaceFilters
) =>
  (!filters.athleteId || assessment.athleteId === filters.athleteId) &&
  (!filters.month || assessment.assessedOn.startsWith(filters.month)) &&
  (!filters.assessmentStatus || assessment.status === filters.assessmentStatus);

const matchesProgramme = (
  programme: {
    athleteId: string;
    phase: string;
    startsOn: string;
    status: string;
  },
  filters: WorkspaceFilters
) =>
  (!filters.athleteId || programme.athleteId === filters.athleteId) &&
  (!filters.month || programme.startsOn.startsWith(filters.month)) &&
  (!filters.phase || programme.phase === filters.phase) &&
  (!filters.programmeStatus || programme.status === filters.programmeStatus);

export const ConditioningWorkspace = () => {
  const router = useRouter();
  const params = useSearchParams();
  const { athletes, ready: athletesReady } = useAthletes();
  const {
    assessments,
    programmes,
    ready: conditioningReady,
  } = useConditioning();

  const requestedTab = params.get("tab") ?? "assessments";
  // SAFETY: the check narrows to the known tab literals before the assertion.
  const tab: Tab = (tabs as readonly string[]).includes(requestedTab)
    ? (requestedTab as Tab)
    : "assessments";
  const athleteId = params.get("athleteId") ?? "";
  const month = params.get("month") ?? "";
  const assessmentStatus = params.get("assessmentStatus") ?? "";
  const phase = params.get("phase") ?? "";
  const programmeStatus = params.get("programmeStatus") ?? "";

  const athleteById = useMemo(
    () => new Map(athletes.map((athlete) => [athlete.id, athlete])),
    [athletes]
  );
  const filters: WorkspaceFilters = {
    assessmentStatus,
    athleteId,
    month,
    phase,
    programmeStatus,
  };
  const assessmentRows = assessments.filter((assessment) =>
    matchesAssessment(assessment, filters)
  );
  const programmeRows = programmes.filter((programme) =>
    matchesProgramme(programme, filters)
  );

  const replaceParams = (next: URLSearchParams) => {
    const search = next.toString();
    router.replace(
      search ? `${CONDITIONING_PATH}?${search}` : CONDITIONING_PATH
    );
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
    replaceParams(next);
  };
  const clearFilters = () => {
    replaceParams(new URLSearchParams({ tab }));
  };
  const hasFilters = Object.values(filters).some(Boolean);

  if (!(athletesReady && conditioningReady)) {
    return <ConditioningWorkspaceSkeleton />;
  }

  return (
    <section aria-labelledby="conditioning-title" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find conditioning records</CardTitle>
          {hasFilters ? (
            <CardAction>
              <Button onClick={clearFilters} size="sm" variant="ghost">
                <XIcon aria-hidden="true" />
                Clear filters
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <Label className={labelClass} htmlFor="conditioning-athlete">
              Athlete
            </Label>
            <AthletePicker
              id="conditioning-athlete"
              value={athleteId}
              onChange={(value) => setFilter("athleteId", value)}
            />
          </div>
          <div>
            <Label className={labelClass} htmlFor="conditioning-month">
              Month
            </Label>
            <MonthPicker
              id="conditioning-month"
              onChange={(value) => setFilter("month", value)}
              value={month}
            />
          </div>
          <div>
            <Label
              className={labelClass}
              htmlFor="conditioning-assessment-status"
            >
              Assessment status
            </Label>
            <Select
              onValueChange={(value) =>
                setFilter("assessmentStatus", value ?? ALL)
              }
              value={assessmentStatus || ALL}
            >
              <SelectTrigger
                className="w-full"
                id="conditioning-assessment-status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {assessmentStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={labelClass} htmlFor="conditioning-phase">
              Programme phase
            </Label>
            <Select
              onValueChange={(value) => setFilter("phase", value ?? ALL)}
              value={phase || ALL}
            >
              <SelectTrigger className="w-full" id="conditioning-phase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All phases</SelectItem>
                {phaseOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label
              className={labelClass}
              htmlFor="conditioning-programme-status"
            >
              Programme status
            </Label>
            <Select
              onValueChange={(value) =>
                setFilter("programmeStatus", value ?? ALL)
              }
              value={programmeStatus || ALL}
            >
              <SelectTrigger
                className="w-full"
                id="conditioning-programme-status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {programmeStatusOptions.map((option) => (
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
        <TabsList aria-label="Conditioning views">
          <TabsTrigger value="assessments">
            Assessments ({assessmentRows.length})
          </TabsTrigger>
          <TabsTrigger value="programmes">
            Programmes ({programmeRows.length})
          </TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "assessments" ? (
        <AssessmentTable athleteById={athleteById} rows={assessmentRows} />
      ) : null}
      {tab === "programmes" ? (
        <ProgrammeTable athleteById={athleteById} rows={programmeRows} />
      ) : null}
      {tab === "progress" ? (
        <ProgressPanel athleteId={athleteId || athletes[0]?.id || ""} />
      ) : null}
    </section>
  );
};

export const ConditioningWorkspaceSkeleton = () => (
  <div className="space-y-6">
    <div className="bg-muted h-12 w-80 animate-pulse rounded-xl" />
    <div className="bg-muted h-32 animate-pulse rounded-xl" />
    <div className="bg-muted h-72 animate-pulse rounded-xl" />
  </div>
);
