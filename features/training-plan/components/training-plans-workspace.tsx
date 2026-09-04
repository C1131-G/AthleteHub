"use client";

import { XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { ArchiveAction } from "@/components/archive-action";
import { ArchivedToggle } from "@/components/archived-toggle";
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
} from "@/components/ui/table";
import { useAthletes } from "@/features/athlete/use-athletes";

import { formatArrows, seasonRange } from "../training-plan-format";
import { trainingPlanHref } from "../training-plan-routes";
import { statusLabel, trainingPlanStatuses } from "../training-plan-types";
import { useTrainingPlans } from "../use-training-plans";
import {
  PlanListEmpty,
  PlanStatusBadge,
  TrainingPlanSkeleton,
} from "./training-plan-parts";

const PLANS_PATH = "/training-plans";
/** Select cannot hold an empty value, so "all" stands in for "no filter". */
const ALL = "all";
const labelClass = "mb-1.5";

export const TrainingPlansWorkspace = () => {
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const { athletes, ready: athletesReady } = useAthletes();
  const {
    archivePlan,
    plans,
    ready: plansReady,
    restorePlan,
  } = useTrainingPlans(showArchived ? { archivedOnly: true } : undefined);
  const [query, setQuery] = useState("");
  const athleteId = params.get("athleteId") ?? "";
  const season = params.get("season") ?? "";
  const requestedStatus = params.get("status") ?? "";
  const status = trainingPlanStatuses.find((item) => item === requestedStatus);
  const athleteById = useMemo(
    () => new Map(athletes.map((athlete) => [athlete.id, athlete])),
    [athletes]
  );

  const rows = plans.filter((plan) => {
    const athlete = athleteById.get(plan.athleteId);
    const haystack =
      `${plan.name} ${athlete?.fullName ?? ""} ${athlete?.athleteId ?? ""}`.toLowerCase();
    return (
      (!athleteId || plan.athleteId === athleteId) &&
      (!status || plan.status === status) &&
      // A season may cross calendar years, so match either end of the range.
      (!season ||
        plan.startsOn.startsWith(season) ||
        plan.endsOn.startsWith(season)) &&
      (!query || haystack.includes(query.toLowerCase()))
    );
  });

  const replaceParams = (next: URLSearchParams) => {
    const search = next.toString();
    router.replace(search ? `${PLANS_PATH}?${search}` : PLANS_PATH);
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
  const clearFilters = () => {
    setQuery("");
    replaceParams(new URLSearchParams());
  };
  const hasFilters = Boolean(athleteId || season || status || query);

  if (!(athletesReady && plansReady)) {
    return <TrainingPlanSkeleton />;
  }

  return (
    <section aria-labelledby="training-plans-title" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {showArchived ? "Archived plans" : "Find plans"}
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
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className={labelClass} htmlFor="plan-search">
              Search plans
            </Label>
            <Input
              id="plan-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Plan name, athlete, or ID"
              value={query}
            />
          </div>
          <div>
            <Label className={labelClass} htmlFor="plan-athlete-filter">
              Athlete
            </Label>
            <Select
              onValueChange={(value) => setFilter("athleteId", value ?? ALL)}
              value={athleteId || ALL}
            >
              <SelectTrigger className="w-full" id="plan-athlete-filter">
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
            <Label className={labelClass} htmlFor="plan-status-filter">
              Status
            </Label>
            <Select
              onValueChange={(value) => setFilter("status", value ?? ALL)}
              value={status || ALL}
            >
              <SelectTrigger className="w-full" id="plan-status-filter">
                <SelectValue>
                  {status ? statusLabel[status] : "All statuses"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {trainingPlanStatuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {statusLabel[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {rows.length ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <caption className="sr-only">
                  Season training plans ({rows.length})
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Plan</TableHead>
                    <TableHead scope="col">Athlete</TableHead>
                    <TableHead scope="col">Season</TableHead>
                    <TableHead scope="col">Weeks</TableHead>
                    <TableHead scope="col">Planned load</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableHead className="h-auto p-3 font-normal" scope="row">
                        {plan.name}
                      </TableHead>
                      <TableCell>
                        {athleteById.get(plan.athleteId)?.fullName ??
                          "Unknown athlete"}
                      </TableCell>
                      <TableCell>{seasonRange(plan)}</TableCell>
                      <TableCell>{plan.weeks.length}</TableCell>
                      <TableCell>
                        {formatArrows(
                          plan.weeks.reduce(
                            (total, week) => total + week.arrowsPlanned,
                            0
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        <PlanStatusBadge status={plan.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            className="underline underline-offset-4"
                            href={trainingPlanHref(plan.id)}
                          >
                            View plan
                          </Link>
                          {showArchived ? (
                            <Button
                              onClick={() => restorePlan(plan.id)}
                              size="sm"
                              variant="outline"
                            >
                              Restore
                            </Button>
                          ) : (
                            <ArchiveAction
                              label={plan.name}
                              onArchive={() => archivePlan(plan.id)}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PlanListEmpty
          label={
            hasFilters
              ? "No plans match these filters."
              : "Set weekly arrow targets and season events for an athlete."
          }
        />
      )}
    </section>
  );
};

export const TrainingPlansWorkspaceSkeleton = () => <TrainingPlanSkeleton />;
