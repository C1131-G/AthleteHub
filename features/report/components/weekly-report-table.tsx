"use client";

import type { CellContext } from "@tanstack/react-table";
import { createColumnHelper, useTable } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  reportTableFeatures,
  reportTableInitialState,
} from "../report-table-config";
import type { WeeklyPerformanceReport } from "../report-types";
import {
  ReportCard,
  ReportEmpty,
  ReportPagination,
  SortableHead,
} from "./report-table-parts";

interface WeeklyRow {
  athleteName: string;
  average: number | undefined;
  distanceM: number | undefined;
  id: string;
  status: string;
  weekStart: string;
}

type WeeklyCell<TValue> = CellContext<
  typeof reportTableFeatures,
  WeeklyRow,
  TValue
>;

const notRecorded = "Not recorded";

const DistanceCell = ({ getValue }: WeeklyCell<number | undefined>) => {
  const distance = getValue();
  return distance ? `${distance} m` : notRecorded;
};

const AverageCell = ({ getValue }: WeeklyCell<number | undefined>) => {
  const average = getValue();
  return average === undefined ? notRecorded : average.toFixed(2);
};

const StatusCell = ({ getValue }: WeeklyCell<string>) => (
  <Badge variant="secondary">{getValue().replace("-", " ")}</Badge>
);

const ActionsHeader = () => <span className="sr-only">Actions</span>;

const ActionsCell = ({ row }: WeeklyCell<unknown>) => (
  <Link
    className="underline underline-offset-4"
    href={`/reports/weekly/${row.original.id}`}
  >
    View weekly report
  </Link>
);

const helper = createColumnHelper<typeof reportTableFeatures, WeeklyRow>();
const columns = helper.columns([
  helper.accessor("weekStart", { header: "Week", sortFn: "text" }),
  helper.accessor("athleteName", { header: "Athlete", sortFn: "text" }),
  helper.accessor("distanceM", {
    cell: DistanceCell,
    header: "Distance",
    sortFn: "basic",
    sortUndefined: "last",
  }),
  helper.accessor("average", {
    cell: AverageCell,
    header: "Average",
    sortFn: "basic",
    sortUndefined: "last",
  }),
  helper.accessor("status", {
    cell: StatusCell,
    header: "Status",
    sortFn: "text",
  }),
  helper.display({
    cell: ActionsCell,
    enableSorting: false,
    header: ActionsHeader,
    id: "actions",
  }),
]);

const averageOf = (scores: number[]) =>
  scores.length
    ? scores.reduce((total, score) => total + score, 0) / scores.length
    : undefined;

export const WeeklyReportTable = ({
  athleteById,
  rows,
}: {
  athleteById: Map<string, { fullName: string }>;
  rows: WeeklyPerformanceReport[];
}) => {
  const data = useMemo<WeeklyRow[]>(
    () =>
      rows.map((row) => ({
        athleteName:
          athleteById.get(row.athleteId)?.fullName ?? "Unknown athlete",
        average: averageOf(row.scores),
        distanceM: row.distanceM,
        id: row.id,
        status: row.status,
        weekStart: row.weekStart,
      })),
    [athleteById, rows]
  );
  const table = useTable({
    columns,
    data,
    enableSortingRemoval: false,
    features: reportTableFeatures,
    initialState: reportTableInitialState,
  });

  if (!data.length) {
    return <ReportEmpty label="No weekly entries match these filters." />;
  }

  return (
    <ReportCard
      footer={
        <ReportPagination
          canNext={table.getCanNextPage()}
          canPrevious={table.getCanPreviousPage()}
          label="Weekly entries"
          onNext={() => table.nextPage()}
          onPrevious={() => table.previousPage()}
          page={table.state.pagination.pageIndex + 1}
          pages={Math.max(1, table.getPageCount())}
          total={data.length}
        />
      }
    >
      <Table>
        <caption className="sr-only">Weekly performance entries</caption>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <SortableHead
                  canSort={header.column.getCanSort()}
                  direction={header.column.getIsSorted()}
                  key={header.id}
                  onToggle={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </SortableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell, index) =>
                // The leading column names the row, so it is a header cell.
                index === 0 ? (
                  <TableHead
                    className="h-auto p-3 font-normal"
                    key={cell.id}
                    scope="row"
                  >
                    <table.FlexRender cell={cell} />
                  </TableHead>
                ) : (
                  <TableCell
                    className={cell.column.id === "actions" ? "text-right" : ""}
                    key={cell.id}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                )
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportCard>
  );
};
