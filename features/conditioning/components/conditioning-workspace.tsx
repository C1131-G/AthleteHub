"use client";

import { XIcon } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";

import { ArchivedToggle } from "@/components/archived-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAthletes } from "@/features/athlete/use-athletes";

import {
  conditioningAssessmentStatuses,
  conditioningPhases,
  conditioningProgrammeStatuses,
} from "../conditioning-types";
import { useConditioning } from "../use-conditioning";
import { AssessmentTable } from "./assessment-table";
import { ConditioningFilters } from "./conditioning-filters";
import { ConditioningWorkspaceSkeleton } from "./conditioning-workspace-skeleton";
import { ProgrammeTable } from "./programme-table";
import { ProgressPanel } from "./progress-panel";

const CONDITIONING_PATH = "/conditioning";
/** Select cannot hold an empty value, so "all" stands in for "no filter". */
const ALL = "all";

const tabs = ["assessments", "programmes", "progress"] as const;
const emptyOr = <T extends z.ZodType>(schema: T) =>
  z.union([z.literal(""), schema]);
const conditioningSearchSchema = z.object({
  assessmentStatus: emptyOr(z.enum(conditioningAssessmentStatuses)).catch(""),
  athleteId: z.string().trim().catch(""),
  month: z
    .string()
    .regex(/^$|^\d{4}-\d{2}$/)
    .catch(""),
  phase: emptyOr(z.enum(conditioningPhases)).catch(""),
  programmeStatus: emptyOr(z.enum(conditioningProgrammeStatuses)).catch(""),
  tab: z.enum(tabs).catch("assessments"),
});

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
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const { athletes, ready: athletesReady } = useAthletes();
  const {
    assessments,
    programmes,
    ready: conditioningReady,
  } = useConditioning(showArchived ? { archivedOnly: true } : undefined);

  const { assessmentStatus, athleteId, month, phase, programmeStatus, tab } =
    conditioningSearchSchema.parse(Object.fromEntries(params.entries()));

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
          <CardTitle>
            {showArchived
              ? "Archived conditioning records"
              : "Find conditioning records"}
          </CardTitle>
          <CardAction className="flex gap-2">
            {hasFilters ? (
              <Button onClick={clearFilters} size="sm" variant="ghost">
                <XIcon aria-hidden="true" />
                Clear filters
              </Button>
            ) : null}
            <ArchivedToggle
              onChange={setShowArchived}
              showArchived={showArchived}
            />
          </CardAction>
        </CardHeader>
        <ConditioningFilters
          assessmentStatus={assessmentStatus}
          athleteId={athleteId}
          month={month}
          onFilter={(key, value) =>
            setFilter(key, value === "all" ? ALL : value)
          }
          phase={phase}
          programmeStatus={programmeStatus}
        />
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
        <AssessmentTable
          archived={showArchived}
          athleteById={athleteById}
          rows={assessmentRows}
        />
      ) : null}
      {tab === "programmes" ? (
        <ProgrammeTable
          archived={showArchived}
          athleteById={athleteById}
          rows={programmeRows}
        />
      ) : null}
      {tab === "progress" ? (
        <ProgressPanel athleteId={athleteId || athletes[0]?.id || ""} />
      ) : null}
    </section>
  );
};
