import {
  describe as bunDescribe,
  expect as bunExpect,
  test as bunTest,
} from "bun:test";

import {
  acwr,
  acwrBand,
  monotony,
  rollingLoad,
  sessionLoad,
  strain,
  weeklyLoadForMonth,
} from "./training-load";
import type { LoadEntry } from "./training-load";

const entry = (
  date: string,
  durationMin: number | null,
  rpe: number | null
): LoadEntry => ({ date, durationMin, rpe });

const rest = (date: string): LoadEntry => ({
  date,
  durationMin: null,
  rpe: null,
});

bunDescribe("session load", () => {
  bunTest("sRPE is rpe times duration", () => {
    bunExpect(sessionLoad({ durationMin: 90, rpe: 7 })).toBe(630);
    bunExpect(sessionLoad({ durationMin: 45, rpe: 10 })).toBe(450);
  });

  bunTest("an unrecorded session produces no load, not zero", () => {
    bunExpect(sessionLoad({ durationMin: null, rpe: 7 })).toBeNull();
    bunExpect(sessionLoad({ durationMin: 90, rpe: null })).toBeNull();
    bunExpect(sessionLoad({ durationMin: null, rpe: null })).toBeNull();
  });
});

bunDescribe("rolling load", () => {
  // Loads per session: 999 (08-30, outside the 7-day window), 630, 450, 150,
  // 630 (09-08, after the window); the 09-06 rest day contributes nothing.
  const entries = [
    entry("2026-08-30", 999, 1),
    entry("2026-09-01", 90, 7),
    entry("2026-09-03", 45, 10),
    entry("2026-09-05", 50, 3),
    entry("2026-09-08", 90, 7),
    rest("2026-09-06"),
  ];

  bunTest("sums session load inside the window ending on the date", () => {
    bunExpect(rollingLoad(entries, 7, "2026-09-07")).toBe(1230);
  });

  bunTest("partial windows just sum what exists", () => {
    bunExpect(rollingLoad(entries, 7, "2026-09-02")).toBe(1629);
    bunExpect(rollingLoad(entries, 28, "2026-09-07")).toBe(2229);
  });
});

bunDescribe("acute:chronic workload ratio", () => {
  const steady = Array.from({ length: 28 }, (_, index) => {
    const day = 28 - index;
    // 700 of load per day.
    const date = `2026-09-${String(day).padStart(2, "0")}`;
    return entry(date, 100, 7);
  });

  bunTest("steady load keeps the ratio at 1", () => {
    bunExpect(acwr(steady, "2026-09-28")).toBe(1);
  });

  bunTest("a spike pushes the ratio up", () => {
    const spiked = [
      // 1200 of load per day this week.
      ...steady.slice(7),
      ...Array.from({ length: 7 }, (_, index) =>
        entry(`2026-09-${22 + index}`, 150, 8)
      ),
    ];
    // Chronic = (21×700 + 7×1200)/4 = 5775; acute = 8400 → ≈ 1.4545.
    bunExpect(acwr(spiked, "2026-09-28")).toBeCloseTo(1.4545, 3);
  });

  bunTest("no chronic history means no ratio", () => {
    bunExpect(acwr([], "2026-09-28")).toBeNull();
  });
});

bunDescribe("ACWR bands", () => {
  bunTest(
    "the band boundaries sit exactly where the scheme defines them",
    () => {
      bunExpect(acwrBand(0.79)).toBe("underload");
      bunExpect(acwrBand(0.8)).toBe("sweet-spot");
      bunExpect(acwrBand(1)).toBe("sweet-spot");
      bunExpect(acwrBand(1.3)).toBe("sweet-spot");
      bunExpect(acwrBand(1.31)).toBe("elevated");
      bunExpect(acwrBand(1.5)).toBe("elevated");
      bunExpect(acwrBand(1.51)).toBe("danger");
    }
  );
});

bunDescribe("weekly load for a month", () => {
  bunTest("buckets days into Monday-start weeks", () => {
    // 07-01 is a Wednesday (week of 06-29); 07-12 a Sunday in the same
    // Monday-start week as 07-06.
    const entries = [
      entry("2026-07-01", 60, 5),
      entry("2026-07-06", 90, 6),
      entry("2026-07-12", 30, 10),
      entry("2026-07-13", 60, 5),
    ];
    bunExpect(weeklyLoadForMonth(entries, "2026-07")).toEqual([
      { load: 300, weekStart: "2026-06-29" },
      { load: 840, weekStart: "2026-07-06" },
      { load: 300, weekStart: "2026-07-13" },
      { load: 0, weekStart: "2026-07-20" },
      { load: 0, weekStart: "2026-07-27" },
    ]);
  });

  bunTest("buckets by the report calendar's week, not the local clock", () => {
    // 2026-03-05 is a Thursday; its Monday-start week begins 2026-03-02 —
    // even in a timezone where local and UTC disagree on the date.
    const entries = [entry("2026-03-05", 60, 5)];
    bunExpect(weeklyLoadForMonth(entries, "2026-03")).toEqual([
      { load: 300, weekStart: "2026-03-02" },
      { load: 0, weekStart: "2026-03-09" },
      { load: 0, weekStart: "2026-03-16" },
      { load: 0, weekStart: "2026-03-23" },
      { load: 0, weekStart: "2026-03-30" },
    ]);
  });

  bunTest("a week with no sessions is listed as zero", () => {
    // Only the week of 07-06 carries sessions; the other July weeks are rest.
    bunExpect(
      weeklyLoadForMonth([entry("2026-07-06", 60, 5)], "2026-07")
    ).toEqual([
      { load: 300, weekStart: "2026-07-06" },
      { load: 0, weekStart: "2026-07-13" },
      { load: 0, weekStart: "2026-07-20" },
      { load: 0, weekStart: "2026-07-27" },
    ]);
  });

  bunTest("two sessions on one day both count", () => {
    // A morning and an evening block on the 21st: both loads land on the same
    // day (600 total), and the week's [600, 0×6] shape gives monotony
    // 1/√6 ≈ 0.4082. Last-wins deduplication would read 300 and 0.4082 × 300.
    const week = [
      entry("2026-09-21", 60, 5),
      entry("2026-09-21", 60, 5),
      rest("2026-09-22"),
      rest("2026-09-23"),
      rest("2026-09-24"),
      rest("2026-09-25"),
      rest("2026-09-26"),
    ];
    bunExpect(rollingLoad(week, 7, "2026-09-27")).toBe(600);
    bunExpect(monotony(week, "2026-09-27")).toBeCloseTo(1 / Math.sqrt(6), 5);
    bunExpect(strain(week, "2026-09-27")).toBeCloseTo(
      600 * (1 / Math.sqrt(6)),
      1
    );
  });

  bunTest("unrecorded sessions contribute no load but stay bucketed", () => {
    bunExpect(
      weeklyLoadForMonth(
        [rest("2026-07-01"), entry("2026-07-02", 60, 5)],
        "2026-07"
      )
    ).toEqual([
      { load: 300, weekStart: "2026-06-29" },
      { load: 0, weekStart: "2026-07-06" },
      { load: 0, weekStart: "2026-07-13" },
      { load: 0, weekStart: "2026-07-20" },
      { load: 0, weekStart: "2026-07-27" },
    ]);
  });
});

bunDescribe("monotony and strain", () => {
  // 500 of load per day, Monday to Friday; the weekend rests.
  const week = [
    entry("2026-09-21", 100, 5),
    entry("2026-09-22", 100, 5),
    entry("2026-09-23", 100, 5),
    entry("2026-09-24", 100, 5),
    entry("2026-09-25", 100, 5),
    rest("2026-09-26"),
    rest("2026-09-27"),
  ];

  bunTest("monotony is mean daily load over its standard deviation", () => {
    // Population SD of [500×5, 0, 0] ≈ 225.93; mean ≈ 357.14 → ≈ 1.5809.
    bunExpect(monotony(week, "2026-09-27")).toBeCloseTo(1.5811, 3);
  });

  bunTest("strain is weekly load times monotony", () => {
    bunExpect(strain(week, "2026-09-27")).toBeCloseTo(3952.85, 1);
  });

  bunTest("a perfectly uniform week has zero SD, so no monotony", () => {
    const uniform = Array.from({ length: 7 }, (_, index) =>
      entry(`2026-09-2${index + 1}`, 60, 5)
    );
    bunExpect(monotony(uniform, "2026-09-27")).toBeNull();
    bunExpect(strain(uniform, "2026-09-27")).toBeNull();
  });

  bunTest("a week with no load at all has no monotony either", () => {
    bunExpect(
      monotony([rest("2026-09-21"), rest("2026-09-27")], "2026-09-27")
    ).toBeNull();
  });
});
