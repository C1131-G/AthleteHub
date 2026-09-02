"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAthletes } from "../use-athletes";
import { AthleteCard, AthleteRow } from "./athlete-list-rows";

const pageSize = 8;

const statusFilterLabel = {
  active: "Active",
  all: "All statuses",
  inactive: "Inactive",
  "medical-leave": "Medical leave",
};
const categoryFilterLabel = {
  all: "All categories",
  barebow: "Barebow",
  compound: "Compound",
  recurve: "Recurve",
};
const isStatusFilter = (
  value: string | null
): value is keyof typeof statusFilterLabel =>
  value !== null && value in statusFilterLabel;
const isCategoryFilter = (
  value: string | null
): value is keyof typeof categoryFilterLabel =>
  value !== null && value in categoryFilterLabel;

export const AthleteList = () => {
  const { athletes, ready } = useAthletes();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<keyof typeof statusFilterLabel>("all");
  const [category, setCategory] =
    useState<keyof typeof categoryFilterLabel>("all");
  const [page, setPage] = useState(1);

  const filtered = athletes.filter((athlete) => {
    const text = `${athlete.fullName} ${athlete.athleteId}`.toLowerCase();
    return (
      text.includes(query.toLowerCase()) &&
      (status === "all" || athlete.status === status) &&
      (category === "all" || athlete.category === category)
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (!ready) {
    return <AthleteListSkeleton />;
  }

  return (
    <div data-testid="athletes-content" className="space-y-6">
      <Card>
        <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            Available athletes{" "}
            <span className="text-muted-foreground font-normal">
              ({filtered.length})
            </span>
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-56">
              <MagnifyingGlassIcon
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <label className="sr-only" htmlFor="athlete-search">
                Search athletes
              </label>
              <Input
                id="athlete-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or ID"
                className="pl-9"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(isStatusFilter(value) ? value : "all");
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filter by status" className="sm:w-36">
                <SelectValue>{statusFilterLabel[status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="medical-leave">Medical leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(isCategoryFilter(value) ? value : "all");
                setPage(1);
              }}
            >
              <SelectTrigger
                aria-label="Filter by category"
                className="sm:w-36"
              >
                <SelectValue>{categoryFilterLabel[category]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="recurve">Recurve</SelectItem>
                <SelectItem value="compound">Compound</SelectItem>
                <SelectItem value="barebow">Barebow</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <Empty className="m-6 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MagnifyingGlassIcon />
                </EmptyMedia>
                <EmptyTitle>No matching athletes</EmptyTitle>
                <EmptyDescription>
                  Try changing the search or filters.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <ul className="divide-y sm:hidden">
                {visible.map((athlete) => (
                  <AthleteCard key={athlete.id} athlete={athlete} />
                ))}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <caption className="sr-only">
                    Available athlete profiles
                  </caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((athlete) => (
                      <AthleteRow key={athlete.id} athlete={athlete} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-muted-foreground text-sm">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const AthleteListSkeleton = () => {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-[32rem] w-full" />
    </div>
  );
};
