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
  ReportCard,
  ReportEmpty,
  ReportPagination,
  SortableHead,
} from "@/features/report/report-table-parts";
import { formatDate } from "@/lib/format";

import { phaseLabel, programmeStatusLabel } from "../conditioning-types";
import type {
  ConditioningPhase,
  ConditioningProgramme,
} from "../conditioning-types";
import {
  conditioningTableFeatures,
  conditioningTableInitialState,
} from "./conditioning-table-config";

export interface ProgrammeRow {
  athleteName: string;
  customPhase: string;
  endsOn: string;
  id: string;
  phase: ConditioningPhase;
  startsOn: string;
  status: ConditioningProgramme["status"];
  title: string;
}

const programmeStatusVariant = {
  active: "default",
  completed: "secondary",
  draft: "outline",
} as const satisfies Record<
  ProgrammeRow["status"],
  "outline" | "default" | "secondary"
>;

type ProgrammeCell<TValue> = CellContext<
  typeof conditioningTableFeatures,
  ProgrammeRow,
  TValue
>;

const StatusCell = ({ getValue }: ProgrammeCell<ProgrammeRow["status"]>) => {
  const status = getValue();
  return (
    <Badge variant={programmeStatusVariant[status]}>
      {programmeStatusLabel[status]}
    </Badge>
  );
};

const PhaseCell = ({ row }: ProgrammeCell<unknown>) => (
  <span>
    {phaseLabel[row.original.phase]}
    {row.original.phase === "custom" && row.original.customPhase
      ? `: ${row.original.customPhase}`
      : ""}
  </span>
);

const ActionsCell = ({ row }: ProgrammeCell<unknown>) => (
  <Link
    className="underline underline-offset-4"
    href={`/conditioning/programmes/${row.original.id}`}
  >
    View
  </Link>
);

const helper = createColumnHelper<
  typeof conditioningTableFeatures,
  ProgrammeRow
>();
const columns = helper.columns([
  helper.accessor("title", { header: "Programme", sortFn: "text" }),
  helper.accessor("athleteName", { header: "Athlete", sortFn: "text" }),
  helper.accessor("startsOn", {
    cell: (cell) => formatDate(cell.getValue()),
    header: "Starts",
    sortFn: "text",
  }),
  helper.accessor("endsOn", {
    cell: (cell) => formatDate(cell.getValue()),
    header: "Ends",
    sortFn: "text",
  }),
  helper.accessor("phase", {
    cell: PhaseCell,
    header: "Phase",
    sortFn: "text",
  }),
  helper.accessor("status", {
    cell: StatusCell,
    header: "Status",
    sortFn: "text",
  }),
  helper.display({
    cell: ActionsCell,
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    id: "actions",
  }),
]);

export const ProgrammeTable = ({
  athleteById,
  rows,
}: {
  athleteById: Map<string, { fullName: string }>;
  rows: ConditioningProgramme[];
}) => {
  const data = useMemo<ProgrammeRow[]>(
    () =>
      rows.map((programme) => ({
        athleteName:
          athleteById.get(programme.athleteId)?.fullName ?? "Unknown athlete",
        customPhase: programme.customPhase ?? "",
        endsOn: programme.endsOn,
        id: programme.id,
        phase: programme.phase,
        startsOn: programme.startsOn,
        status: programme.status,
        title: programme.title,
      })),
    [athleteById, rows]
  );
  const table = useTable({
    columns,
    data,
    enableSortingRemoval: false,
    features: conditioningTableFeatures,
    initialState: conditioningTableInitialState,
  });

  if (!data.length) {
    return (
      <ReportEmpty label="No programmes match these filters. Create a dated weekly programme to schedule training sessions." />
    );
  }

  return (
    <ReportCard
      footer={
        <ReportPagination
          canNext={table.getCanNextPage()}
          canPrevious={table.getCanPreviousPage()}
          label="Programmes"
          onNext={() => table.nextPage()}
          onPrevious={() => table.previousPage()}
          page={table.state.pagination.pageIndex + 1}
          pages={Math.max(1, table.getPageCount())}
          total={data.length}
        />
      }
    >
      <Table>
        <caption className="sr-only">Conditioning programmes</caption>
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
