import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { ReportActions } from "./report-actions";

interface AthleteRow {
  athlete: string;
}

const columns = [
  { header: "Athlete", value: (row: AthleteRow) => row.athlete },
];

// The csv button is the only control whose availability depends on the rows.
// Match a real disabled attribute on its opening tag; class names also hold
// the word "disabled" via Tailwind variants, so a substring check would lie.
const csvButtonDisabled = (markup: string) => {
  const labelAt = markup.indexOf("Download CSV");
  const buttonAt = markup.lastIndexOf("<button", labelAt);
  const tagEnd = markup.indexOf(">", buttonAt);
  return markup.slice(buttonAt, tagEnd).includes(' disabled=""');
};

bunDescribe("report actions csv", () => {
  bunTest("disables Download CSV when there is nothing to export", () => {
    const markup = renderToStaticMarkup(
      <ReportActions columns={columns} rows={[]} summary="s" title="t" />
    );

    bunExpect(csvButtonDisabled(markup)).toBe(true);
  });

  bunTest("enables Download CSV once rows exist", () => {
    const markup = renderToStaticMarkup(
      <ReportActions
        columns={columns}
        rows={[{ athlete: "=SUM(A1:A9)" }]}
        summary="s"
        title="t"
      />
    );

    bunExpect(csvButtonDisabled(markup)).toBe(false);
  });
});
