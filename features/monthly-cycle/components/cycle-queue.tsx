"use client";

import { PlayIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ArchiveAction } from "@/components/archive-action";
import { ArchivedToggle } from "@/components/archived-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { categoryLabel } from "@/features/athlete/athlete-labels";
import { AthletePicker } from "@/features/athlete/athlete-picker";
import { bowCategories } from "@/features/athlete/athlete-types";
import type { Athlete } from "@/features/athlete/athlete-types";
import { useAthletes } from "@/features/athlete/use-athletes";
import { monthLabel } from "@/features/report/report-calculations";
import type { WeeklyPerformanceReport } from "@/features/report/report-types";
import { useReports } from "@/features/report/use-reports";
import { initials } from "@/lib/format";

import {
  overdueAthletes,
  sourcesMatch,
  weeklyCoverageFor,
} from "../monthly-cycle-lifecycle";
import { monthlyCycleStepMeta } from "../monthly-cycle-steps";
import { blankCycleSteps } from "../monthly-cycle-types";
import type {
  CycleQueueState,
  MonthlyAthleteCycle,
} from "../monthly-cycle-types";
import { useMonthlyCycles } from "../use-monthly-cycles";
import { CycleStateBadge } from "./cycle-shell";

interface QueueRow {
  athleteId: string;
  cycle: MonthlyAthleteCycle | undefined;
  currentStep: string;
  fullName: string;
  percent: number;
  photoUrl: string | undefined;
  rosterCode: string;
  state: CycleQueueState;
}

/** Resume an existing cycle, or start the month for an athlete without one. */
const renderCycleAction = (
  row: QueueRow,
  startFor: (athleteId: string) => Promise<void>
) =>
  row.cycle ? (
    <Link
      className={buttonVariants({ size: "sm", variant: "outline" })}
      href={`/monthly-cycles/${row.cycle.id}/${row.cycle.lastVisitedStep}`}
    >
      <PlayIcon aria-hidden /> Resume
    </Link>
  ) : (
    <button
      className={buttonVariants({ size: "sm" })}
      onClick={() => startFor(row.athleteId)}
      type="button"
    >
      <PlusIcon aria-hidden /> Start
    </button>
  );

const currentMonth = () => new Date().toISOString().slice(0, 7);

/**
 * Queue-level state uses what is cheap to derive for every athlete: the
 * athlete's own record version and the weekly coverage. Step-level staleness
 * in the other domains is surfaced inside the cycle itself.
 */
const queueStateFor = (
  cycle: MonthlyAthleteCycle | undefined,
  athlete: Athlete,
  weekly: WeeklyPerformanceReport[],
  month: string,
  today: string
): CycleQueueState => {
  if (!cycle) {
    return "not-started";
  }
  const pastUncovered = weeklyCoverageFor(weekly, athlete.id, month).some(
    (entry) => !entry.counts && entry.weekStart <= today
  );
  const { profile } = cycle.steps;
  const profileStale =
    profile.status !== "pending" &&
    !sourcesMatch(
      profile.sources,
      athlete ? [{ id: athlete.id, updatedAt: athlete.updatedAt }] : []
    );
  if (cycle.status === "complete" && !pastUncovered && !profileStale) {
    return "complete";
  }
  return pastUncovered || profileStale ? "needs-attention" : "in-progress";
};

export const CycleQueue = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { athletes } = useAthletes();
  const [showArchived, setShowArchived] = useState(false);
  const { archiveCycle, createCycle, cycles, restoreCycle } = useMonthlyCycles(
    showArchived ? { archivedOnly: true } : undefined
  );
  const { listWeekly } = useReports();

  const month = searchParams.get("month") || currentMonth();
  const statusFilter = searchParams.get("status") ?? "all";
  const categoryFilter = searchParams.get("category") ?? "all";
  const summary = searchParams.get("summary") === "month-complete";
  const today = new Date().toISOString().slice(0, 10);

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.replace(`/monthly-cycles?${params.toString()}`);
  };

  const startFor = async (athleteId: string) => {
    const existing = cycles.find(
      (entry) =>
        entry.athleteId.toLowerCase() === athleteId.toLowerCase() &&
        entry.month === month
    );
    if (existing) {
      router.push(`/monthly-cycles/${existing.id}/${existing.lastVisitedStep}`);
      return;
    }
    const created = await createCycle({
      athleteId,
      lastVisitedStep: "profile",
      month,
      status: "not-started",
      steps: blankCycleSteps(),
    });
    if (created.status === "saved") {
      router.push(`/monthly-cycles/${created.record.id}/profile`);
    }
  };

  const rows: QueueRow[] = useMemo(() => {
    const result: QueueRow[] = [];
    const cyclesByAthlete = new Map(
      cycles.map((entry) => [
        `${entry.athleteId.toLowerCase()}:${entry.month}`,
        entry,
      ])
    );
    const stepsByStep = new Map(
      monthlyCycleStepMeta.map((meta) => [meta.step, meta])
    );
    for (const athlete of athletes) {
      if (athlete.status !== "active") {
        continue;
      }
      if (categoryFilter !== "all" && athlete.category !== categoryFilter) {
        continue;
      }
      const cycle = cyclesByAthlete.get(`${athlete.id.toLowerCase()}:${month}`);
      const state = queueStateFor(cycle, athlete, listWeekly, month, today);
      if (statusFilter !== "all" && state !== statusFilter) {
        continue;
      }
      const currentStepMeta = cycle
        ? stepsByStep.get(cycle.lastVisitedStep)
        : undefined;
      let confirmed = 0;
      if (cycle) {
        for (const meta of monthlyCycleStepMeta) {
          const stepStatus = cycle.steps[meta.step].status;
          if (stepStatus === "complete" || stepStatus === "exception") {
            confirmed += 1;
          }
        }
      }
      result.push({
        athleteId: athlete.id,
        currentStep: currentStepMeta?.label ?? "—",
        cycle,
        fullName: athlete.fullName,
        percent: cycle
          ? Math.round((confirmed / monthlyCycleStepMeta.length) * 100)
          : 0,
        photoUrl: athlete.photoUrl,
        rosterCode: athlete.athleteId,
        state,
      });
    }
    // The archived view is about the cycles themselves, so athletes without
    // one have nothing to show there.
    return showArchived ? result.filter((row) => row.cycle) : result;
  }, [
    athletes,
    categoryFilter,
    cycles,
    listWeekly,
    month,
    showArchived,
    statusFilter,
    today,
  ]);

  const counts = {
    attention: rows.filter((row) => row.state === "needs-attention").length,
    complete: rows.filter((row) => row.state === "complete").length,
    inProgress: rows.filter((row) => row.state === "in-progress").length,
    notStarted: rows.filter((row) => row.state === "not-started").length,
  };

  return (
    <div className="space-y-6">
      {(() => {
        const overdue = overdueAthletes(
          athletes,
          cycles,
          month,
          currentMonth()
        );
        return overdue.length > 0 ? (
          <div aria-live="polite">
            <Alert>
              <AlertTitle>Cycles overdue</AlertTitle>
              <AlertDescription>
                {monthLabel(month)} is under way and these athletes have no
                complete cycle yet:{" "}
                {overdue.map((entry) => entry.fullName).join(", ")}.
              </AlertDescription>
            </Alert>
          </div>
        ) : null;
      })()}
      {summary ? (
        <Alert>
          <AlertTitle>Month complete</AlertTitle>
          <AlertDescription>
            Every active athlete has a complete cycle for {monthLabel(month)}.
            Choose another month whenever you are ready.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Not started" value={counts.notStarted} />
        <KpiCard label="In progress" value={counts.inProgress} />
        <KpiCard label="Needs attention" value={counts.attention} />
        <KpiCard label="Complete" value={counts.complete} />
      </div>
      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>
              {showArchived ? "Archived cycles" : "Monthly cycle queue"}
            </CardTitle>
            <CardDescription>
              Active athletes in roster order for {monthLabel(month)}.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <ArchivedToggle
              onChange={setShowArchived}
              showArchived={showArchived}
            />
            <div className="min-w-44">
              <Label
                className="text-muted-foreground mb-1"
                htmlFor="queue-month"
              >
                Month
              </Label>
              <MonthPicker
                id="queue-month"
                onChange={(value) => setParam("month", value)}
                value={month}
              />
            </div>
            <div className="min-w-56">
              <span className="text-muted-foreground mb-1 block text-sm">
                Start or resume for athlete
              </span>
              <AthletePicker
                id="queue-athlete-picker"
                onChange={(athleteId) => {
                  if (athleteId) {
                    startFor(athleteId);
                  }
                }}
                value=""
              />
            </div>
            <div>
              <Label
                className="text-muted-foreground mb-1 block text-sm"
                htmlFor="queue-status"
              >
                Status
              </Label>
              <Select
                onValueChange={(value) => setParam("status", value)}
                value={statusFilter}
              >
                <SelectTrigger className="w-40" id="queue-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="not-started">Not started</SelectItem>
                  <SelectItem value="in-progress">In progress</SelectItem>
                  <SelectItem value="needs-attention">
                    Needs attention
                  </SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                className="text-muted-foreground mb-1 block text-sm"
                htmlFor="queue-category"
              >
                Category
              </Label>
              <Select
                onValueChange={(value) => setParam("category", value)}
                value={categoryFilter}
              >
                <SelectTrigger className="w-36" id="queue-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {bowCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {categoryLabel[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption className="sr-only">
              Monthly athlete lifecycle queue
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Athlete</TableHead>
                <TableHead scope="col">State</TableHead>
                <TableHead scope="col">Progress</TableHead>
                <TableHead scope="col">Current step</TableHead>
                <TableHead scope="col">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.athleteId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage alt="" src={row.photoUrl} />
                        <AvatarFallback>
                          {initials(row.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{row.fullName}</p>
                        <p className="text-muted-foreground text-xs">
                          {row.rosterCode}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CycleStateBadge state={row.state} />
                  </TableCell>
                  <TableCell className="tabular-nums">{row.percent}%</TableCell>
                  <TableCell>{row.currentStep}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {renderCycleAction(row, startFor)}
                      {row.cycle && showArchived ? (
                        <Button
                          onClick={() => restoreCycle(row.cycle?.id ?? "")}
                          size="sm"
                          variant="outline"
                        >
                          Restore
                        </Button>
                      ) : null}
                      {row.cycle && !showArchived ? (
                        <ArchiveAction
                          label={`${row.fullName}'s ${monthLabel(month)} cycle`}
                          onArchive={() => archiveCycle(row.cycle?.id ?? "")}
                        />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="text-muted-foreground py-6 text-center text-sm">
                      No athletes match the current filters.
                    </p>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const KpiCard = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardHeader>
      <CardDescription>{label}</CardDescription>
      <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
    </CardHeader>
  </Card>
);
