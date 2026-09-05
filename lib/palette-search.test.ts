import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import { searchPalette } from "./palette-search";
import type { PaletteItem } from "./palette-search";

const items: PaletteItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/athletes/new", keywords: "create roster", label: "Add athlete" },
  { href: "/athletes", keywords: "roster list", label: "Athletes" },
  { href: "/reports", label: "Reports" },
  { href: "/sessions", label: "Sessions" },
  { href: "/settings", label: "Settings" },
];

bunDescribe("palette search", () => {
  bunTest("an empty query lists everything in order", () => {
    bunExpect(searchPalette("", items).map((match) => match.href)).toEqual([
      "/dashboard",
      "/athletes/new",
      "/athletes",
      "/reports",
      "/sessions",
      "/settings",
    ]);
  });

  bunTest("a label prefix outranks a substring deeper in the label", () => {
    // "Sessions" and "Settings" start with "s", so they outrank every label
    // that merely contains an "s" — including "Athletes", which precedes them
    // in the input order.
    const matches = searchPalette("s", items);
    bunExpect(matches.map((match) => match.label)).toEqual([
      "Sessions",
      "Settings",
      "Athletes",
      "Dashboard",
      "Reports",
      "Add athlete",
    ]);
  });

  bunTest("keywords make hidden aliases findable", () => {
    bunExpect(
      searchPalette("roster", items).map((match) => match.label)
    ).toEqual(["Add athlete", "Athletes"]);
  });

  bunTest("matching is case-insensitive", () => {
    bunExpect(searchPalette("DASH", items)[0]?.label).toBe("Dashboard");
  });

  bunTest("queries that match nothing return nothing", () => {
    bunExpect(searchPalette("zzz", items)).toEqual([]);
  });
});
