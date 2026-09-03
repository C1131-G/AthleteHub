"use client";

import {
  ArrowDownIcon,
  ArrowsDownUpIcon,
  ArrowUpIcon,
  CalendarBlankIcon,
} from "@phosphor-icons/react";
import type { SortDirection } from "@tanstack/react-table";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TableHead } from "@/components/ui/table";

export type ColumnSortState = false | SortDirection;

const ariaSortValue = {
  asc: "ascending",
  desc: "descending",
} as const;

const sortHint = {
  asc: "sorted ascending",
  desc: "sorted descending",
} as const;

export const ReportCard = ({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) => (
  <Card>
    <CardContent className="p-0">
      <div className="overflow-x-auto">{children}</div>
      {footer}
    </CardContent>
  </Card>
);

export const ReportEmpty = ({ label }: { label: string }) => (
  <Empty className="border">
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <CalendarBlankIcon />
      </EmptyMedia>
      <EmptyTitle>No reports</EmptyTitle>
      <EmptyDescription>{label}</EmptyDescription>
    </EmptyHeader>
  </Empty>
);

const SortIndicator = ({ direction }: { direction: ColumnSortState }) => {
  if (direction === "asc") {
    return <ArrowUpIcon aria-hidden="true" className="size-3.5" />;
  }
  if (direction === "desc") {
    return <ArrowDownIcon aria-hidden="true" className="size-3.5" />;
  }
  return (
    <ArrowsDownUpIcon aria-hidden="true" className="size-3.5 opacity-40" />
  );
};

/**
 * Header cell that renders a sort toggle when the column allows it. Props are
 * plain values so the component stays free of the table's generic parameters.
 */
export const SortableHead = ({
  canSort,
  children,
  direction,
  onToggle,
}: {
  canSort: boolean;
  children: ReactNode;
  direction: ColumnSortState;
  onToggle?: ((event: unknown) => void) | undefined;
}) => (
  <TableHead
    aria-sort={direction ? ariaSortValue[direction] : "none"}
    scope="col"
  >
    {canSort ? (
      <button
        className="focus-visible:border-ring focus-visible:ring-ring/50 hover:text-foreground -mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
        onClick={onToggle}
        type="button"
      >
        {children}
        <SortIndicator direction={direction} />
        <span className="sr-only">
          {direction ? sortHint[direction] : "not sorted"}
        </span>
      </button>
    ) : (
      children
    )}
  </TableHead>
);

export const ReportPagination = ({
  canNext,
  canPrevious,
  label,
  onNext,
  onPrevious,
  page,
  pages,
  total,
}: {
  canNext: boolean;
  canPrevious: boolean;
  label: string;
  onNext: () => void;
  onPrevious: () => void;
  page: number;
  pages: number;
  total: number;
}) => (
  <nav
    aria-label={`${label} pagination`}
    className="flex items-center justify-between border-t px-6 py-4"
  >
    <p className="text-muted-foreground text-sm">
      Page {page} of {pages} · {total} {total === 1 ? "row" : "rows"}
    </p>
    <div className="flex gap-2">
      <Button
        disabled={!canPrevious}
        onClick={onPrevious}
        size="sm"
        variant="outline"
      >
        Previous
      </Button>
      <Button disabled={!canNext} onClick={onNext} size="sm" variant="outline">
        Next
      </Button>
    </div>
  </nav>
);
