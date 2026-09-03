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

import {
  conditioningAssessmentHref,
  conditioningNewAssessmentHref,
} from "../conditioning-routes";
import { assessmentStatusLabel } from "../conditioning-types";
import type { ConditioningAssessment } from "../conditioning-types";
import {
  conditioningTableFeatures,
  conditioningTableInitialState,
} from "./conditioning-table-config";

interface AssessmentRow {
  athleteName: string;
  assessedOn: string;
  id: string;
  resultCount: number;
  status: ConditioningAssessment["status"];
}

type AssessmentCell<TValue> = CellContext<
  typeof conditioningTableFeatures,
  AssessmentRow,
  TValue
>;

const statusVariant = {
  absent: "outline",
  completed: "default",
  "medical-exemption": "outline",
  partial: "secondary",
} as const;

const StatusCell = ({ getValue }: AssessmentCell<AssessmentRow["status"]>) => {
  const status = getValue();
  return (
    <Badge variant={statusVariant[status]}>
      {assessmentStatusLabel[status]}
    </Badge>
  );
};

const ResultsCell = ({ getValue }: AssessmentCell<number>) =>
  getValue() === 0 ? "—" : `${getValue()} tests`;

const ActionsCell = ({ row }: AssessmentCell<unknown>) => (
  <Link
    className="underline underline-offset-4"
    href={conditioningAssessmentHref(row.original.id)}
  >
    View
  </Link>
);

const helper = createColumnHelper<
  typeof conditioningTableFeatures,
  AssessmentRow
>();
const columns = helper.columns([
  helper.accessor("assessedOn", {
    cell: (cell) => formatDate(cell.getValue()),
    header: "Assessed on",
    sortFn: "text",
  }),
  helper.accessor("athleteName", { header: "Athlete", sortFn: "text" }),
  helper.accessor("status", {
    cell: StatusCell,
    header: "Status",
    sortFn: "text",
  }),
  helper.accessor("resultCount", {
    cell: ResultsCell,
    header: "Results",
    sortFn: "text",
  }),
  helper.display({
    cell: ActionsCell,
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    id: "actions",
  }),
]);

export const AssessmentTable = ({
  athleteById,
  rows,
}: {
  athleteById: Map<string, { fullName: string }>;
  rows: ConditioningAssessment[];
}) => {
  const data = useMemo<AssessmentRow[]>(
    () =>
      rows.map((assessment) => ({
        assessedOn: assessment.assessedOn,
        athleteName:
          athleteById.get(assessment.athleteId)?.fullName ?? "Unknown athlete",
        id: assessment.id,
        resultCount: assessment.results.length,
        status: assessment.status,
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
      <ReportEmpty label="No assessments match these filters. Record one to start tracking strength and conditioning results." />
    );
  }

  return (
    <ReportCard
      footer={
        <ReportPagination
          canNext={table.getCanNextPage()}
          canPrevious={table.getCanPreviousPage()}
          label="Assessments"
          onNext={() => table.nextPage()}
          onPrevious={() => table.previousPage()}
          page={table.state.pagination.pageIndex + 1}
          pages={Math.max(1, table.getPageCount())}
          total={data.length}
        />
      }
    >
      <Table>
        <caption className="sr-only">Conditioning assessments</caption>
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

export const AssessmentTableEmptyAction = ({
  athleteId,
}: {
  athleteId: string;
}) => (
  <Link
    className="underline underline-offset-4"
    href={conditioningNewAssessmentHref(athleteId)}
  >
    New assessment
  </Link>
);
