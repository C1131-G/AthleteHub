import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { downloadFile, slugifyReportFilename, toCsv } from "./csv";

interface Row {
  name: string;
  notes?: string;
  score?: number;
}

const columns = [
  { header: "Name", value: (row: Row) => row.name },
  { header: "Score", value: (row: Row) => row.score },
  { header: "Notes", value: (row: Row) => row.notes },
];

bunDescribe("csv", () => {
  bunTest("writes a header row even with no data", () => {
    bunExpect(toCsv([], columns)).toBe("Name,Score,Notes");
  });

  bunTest("writes empty cells for missing values", () => {
    bunExpect(toCsv([{ name: "Jatin" }], columns)).toBe(
      "Name,Score,Notes\r\nJatin,,"
    );
  });

  bunTest("quotes cells that would break the row structure", () => {
    const csv = toCsv(
      [{ name: 'Say "hi", loudly', notes: "line one\nline two", score: 7 }],
      columns
    );
    bunExpect(csv).toBe(
      'Name,Score,Notes\r\n"Say ""hi"", loudly",7,"line one\nline two"'
    );
  });

  bunTest("keeps the column order it was given", () => {
    const csv = toCsv([{ name: "A", notes: "n", score: 1 }], columns);
    bunExpect(csv.split("\r\n")[1]).toBe("A,1,n");
  });
});

bunDescribe("csv formula injection", () => {
  bunTest("neutralises cells a spreadsheet would run as a formula", () => {
    const rows = [
      { name: "=SUM(A1:A9)" },
      { name: "+1" },
      { name: "-2" },
      { name: "@cmd" },
    ];
    const csv = toCsv(rows, [{ header: "Name", value: (row) => row.name }]);
    bunExpect(csv.split("\r\n").slice(1)).toEqual([
      "'=SUM(A1:A9)",
      "'+1",
      "'-2",
      "'@cmd",
    ]);
  });

  bunTest("still quotes a neutralised cell that holds a comma", () => {
    const csv = toCsv(
      [{ name: "=a,b" }],
      [{ header: "Name", value: (row) => row.name }]
    );
    bunExpect(csv.split("\r\n")[1]).toBe('"\'=a,b"');
  });
});

bunDescribe("slugifyReportFilename", () => {
  bunTest("lowercases and dashes the title", () => {
    bunExpect(
      slugifyReportFilename("AthleteHub performance report", "csv")
    ).toBe("athletehub-performance-report.csv");
  });

  bunTest("trims leading and trailing dashes", () => {
    bunExpect(slugifyReportFilename("  Hello!!World  ", "csv")).toBe(
      "hello-world.csv"
    );
  });

  bunTest("falls back when the title holds nothing usable", () => {
    bunExpect(slugifyReportFilename("!!!", "html")).toBe("report.html");
  });
});

bunDescribe("downloadFile", () => {
  bunTest("hands the blob to the browser as a download", async () => {
    const seen: { blob: Blob; filename: string; href: string }[] = [];
    const createdUrls: string[] = [];
    const revokedUrls: string[] = [];
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const originalDocument = globalThis.document;
    let clicked = 0;
    let removed = 0;
    let appended = 0;

    // SAFETY: test double keeps the (blob) -> url contract the download helper uses.
    URL.createObjectURL = ((blob: Blob) => {
      createdUrls.push("blob:stub");
      seen.push({ blob, filename: "", href: "" });
      return "blob:stub";
    }) as typeof URL.createObjectURL;
    // SAFETY: test double keeps the (url) -> void contract the download helper uses.
    URL.revokeObjectURL = ((url: string) => {
      revokedUrls.push(url);
    }) as typeof URL.revokeObjectURL;
    const link = {
      click: () => {
        clicked += 1;
      },
      download: "",
      href: "",
      remove: () => {
        removed += 1;
      },
    };
    const fakeDocument = {
      body: {
        append: () => {
          appended += 1;
        },
      },
      createElement: () => link,
    };
    Object.assign(globalThis, { document: fakeDocument });

    try {
      downloadFile("report.csv", "a,b", "text/csv;charset=utf-8");
      bunExpect(clicked).toBe(1);
      bunExpect(appended).toBe(1);
      bunExpect(removed).toBe(1);
      bunExpect(link.download).toBe("report.csv");
      bunExpect(link.href).toBe("blob:stub");
      bunExpect(revokedUrls).toEqual(["blob:stub"]);
      bunExpect(seen).toHaveLength(1);
      const blob = seen[0]?.blob;
      bunExpect(await blob?.text()).toBe("a,b");
      bunExpect(blob?.type).toBe("text/csv;charset=utf-8");
      bunExpect(createdUrls).toEqual(["blob:stub"]);
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      globalThis.document = originalDocument;
    }
  });
});
