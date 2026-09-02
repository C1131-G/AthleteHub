"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ChartCard = ({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: ReactNode;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent aria-label={label}>{children}</CardContent>
  </Card>
);
/** Every chart shows this instead of an empty plot area. */
export const ChartEmpty = ({ label }: { label: string }) => (
  <p className="text-muted-foreground py-8 text-center text-sm">{label}</p>
);

export const ChartLegend = ({
  series,
}: {
  series: { color: string; label: string }[];
}) => (
  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
    {series.map(({ color, label }) => (
      <li
        className="text-muted-foreground flex items-center gap-2 text-sm"
        key={label}
      >
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </li>
    ))}
  </ul>
);

export const DataTable = ({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) => (
  <details className="mt-4">
    <summary className="cursor-pointer text-sm underline">
      Show exact chart data
    </summary>
    <table className="mt-2 w-full text-sm">
      <caption className="sr-only">Exact chart data</caption>
      <thead>
        <tr>
          {headers.map((header) => (
            <th className="p-1 text-left" key={header} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          // Rows and cells carry no ids; position is the only stable identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: table data is positional
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) =>
              cellIndex === 0 ? (
                // The first column names the row, so it is a header cell.
                // biome-ignore lint/suspicious/noArrayIndexKey: table data is positional
                <th
                  className="p-1 text-left font-normal"
                  key={cellIndex}
                  scope="row"
                >
                  {cell}
                </th>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: table data is positional
                <td className="p-1" key={cellIndex}>
                  {cell}
                </td>
              )
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </details>
);
