export type CsvValue = boolean | number | string | null | undefined;

const escapeCell = (value: CsvValue) => {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  // A leading =, +, - or @ makes a spreadsheet treat the cell as a formula, so
  // text a coach typed could execute when the file is opened. Prefix it so the
  // cell stays text.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  // Quote when the cell would otherwise break the row or column structure.
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/**
 * Rows are written in the order the columns are given, so a caller controls
 * the sheet's shape rather than depending on object key order.
 */
export const toCsv = <TRow>(
  rows: readonly TRow[],
  columns: readonly { header: string; value: (row: TRow) => CsvValue }[]
): string => {
  const lines = [columns.map((column) => escapeCell(column.header)).join(",")];
  for (const row of rows) {
    lines.push(
      columns.map((column) => escapeCell(column.value(row))).join(",")
    );
  }
  return lines.join("\r\n");
};

/**
 * Titles become filenames, so anything outside a-z0-9 collapses to a dash and
 * stray dashes are trimmed rather than leaking into the download name.
 */
export const slugifyReportFilename = (
  title: string,
  extension: string
): string => {
  const stem = title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return `${stem === "" ? "report" : stem}.${extension}`;
};

/** Hands the file to the browser (and to Electron's own save dialog). */
export const downloadFile = (
  filename: string,
  contents: string,
  type: string
) => {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
