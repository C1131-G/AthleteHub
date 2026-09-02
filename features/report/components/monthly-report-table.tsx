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

import { monthLabel } from "../report-calculations";
import {
  reportTableFeatures,
  reportTableInitialState,
} from "../report-table-config";
import type { MonthlyPerformanceReport } from "../report-types";
import {
  ReportCard,
  ReportEmpty,
  ReportPagination,
  SortableHead,
} from "./report-table-parts";

interface MonthlyRow {
  athleteName: string;
  highlights: string;
  id: string;
  month: string;
  status: string;
}

type MonthlyCell<TValue> = CellContext<
  typeof reportTableFeatures,
  MonthlyRow,
  TValue
>;

const MonthCell = ({ getValue }: MonthlyCell<string>) => monthLabel(getValue());

const StatusCell = ({ getValue }: MonthlyCell<string>) => {
  const status = getValue();
  return (
    <Badge variant={status === "complete" ? "default" : "secondary"}>
      {status}
    </Badge>
  );
};

const ActionsHeader = () => <span className="sr-only">Actions</span>;

const ActionsCell = ({ row }: MonthlyCell<unknown>) => (
  <Link
    className="underline underline-offset-4"
    href={`/reports/monthly/${row.original.id}`}
  >
    View monthly report
  </Link>
);

const helper = createColumnHelper<typeof reportTableFeatures, MonthlyRow>();
const columns = helper.columns([
  helper.accessor("month", {
    cell: MonthCell,
    header: "Month",
    sortFn: "text",
  }),
  helper.accessor("athleteName", { header: "Athlete", sortFn: "text" }),
  helper.accessor("highlights", { header: "Highlights", sortFn: "text" }),
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

export const MonthlyReportTable = ({
  athleteById,
  month,
  rows,
}: {
  athleteById: Map<string, { fullName: string }>;
  month: string;
  rows: MonthlyPerformanceReport[];
}) => {
  const data = useMemo<MonthlyRow[]>(() => {
    const visible: MonthlyRow[] = [];
    for (const row of rows) {
      if (month && row.month !== month) {
        continue;
      }
      visible.push({
        athleteName:
          athleteById.get(row.athleteId)?.fullName ?? "Unknown athlete",
        highlights: row.performanceHighlights || "No highlights",
        id: row.id,
        month: row.month,
        status: row.status,
      });
    }
    return visible;
  }, [athleteById, month, rows]);
  const table = useTable({
    columns,
    data,
    enableSortingRemoval: false,
    features: reportTableFeatures,
    initialState: reportTableInitialState,
  });

  if (!data.length) {
    return <ReportEmpty label="No monthly reports match these filters." />;
  }

  return (
    <ReportCard
      footer={
        <ReportPagination
          canNext={table.getCanNextPage()}
          canPrevious={table.getCanPreviousPage()}
          label="Monthly reports"
          onNext={() => table.nextPage()}
          onPrevious={() => table.previousPage()}
          page={table.state.pagination.pageIndex + 1}
          pages={Math.max(1, table.getPageCount())}
          total={data.length}
        />
      }
    >
      <Table>
        <caption className="sr-only">Monthly performance reports</caption>
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
