/**
 * Foster-style session-load arithmetic: session sRPE, rolling acute/chronic
 * loads, the acute:chronic workload ratio, and Foster's monotony and strain.
 *
 * Pure calculation only — no database, no React. The distinction between
 * "no load" (null: an unrecorded session) and "zero load" (a rest day) is
 * load-bearing: an unrecorded session must not silently read as rest.
 */
import { sessionWeekStart } from "../features/report/report-calculations";

export interface LoadEntry {
  /** Calendar date, `yyyy-MM-dd`. */
  date: string;
  durationMin: number | null;
  rpe: number | null;
}

const DAY_MS = 86_400_000;

/** Day difference between two `yyyy-MM-dd` dates (b − a). */
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);

/** Foster's session load: RPE × duration. Null when either is unrecorded. */
export const sessionLoad = (entry: {
  durationMin: number | null;
  rpe: number | null;
}): number | null =>
  entry.durationMin === null || entry.rpe === null
    ? null
    : entry.durationMin * entry.rpe;

/**
 * Sum of session load over the `windowDays` days ending on `onDate`
 * (inclusive). Sessions without load contribute nothing; an empty window
 * yields zero, which callers must treat as "no history", not rest.
 */
export const rollingLoad = (
  entries: LoadEntry[],
  windowDays: number,
  onDate: string
): number => {
  let total = 0;
  for (const entry of entries) {
    const offset = daysBetween(entry.date, onDate);
    if (offset < 0 || offset >= windowDays) {
      continue;
    }
    const load = sessionLoad(entry);
    total += load ?? 0;
  }
  return total;
};

/**
 * Acute:chronic workload ratio. Acute is the 7-day load; chronic is the
 * average weekly load across the trailing 28 days. Null when there is no
 * chronic history (fewer than 28 days are fine — a partial history still
 * counts, but zero load in it does not).
 */
export const acwr = (entries: LoadEntry[], onDate: string): number | null => {
  const chronic = rollingLoad(entries, 28, onDate) / 4;
  if (chronic === 0) {
    return null;
  }
  return rollingLoad(entries, 7, onDate) / chronic;
};

export type AcwrBand = "danger" | "elevated" | "sweet-spot" | "underload";

/**
 * Gabbett's bands, inclusive at the sweet spot's edges: below 0.8 is
 * undertraining, 0.8–1.3 the sweet spot, up to 1.5 elevated, above 1.5 the
 * danger zone.
 */
export const acwrBand = (ratio: number): AcwrBand => {
  if (ratio < 0.8) {
    return "underload";
  }
  if (ratio <= 1.3) {
    return "sweet-spot";
  }
  if (ratio <= 1.5) {
    return "elevated";
  }
  return "danger";
};

/**
 * Monthly actual load bucketed into Monday-start weeks (the report calendar —
 * the same `sessionWeekStart` the dashboard and weekly reports use), ordered
 * by week. Every week whose Monday falls inside the month is listed, even
 * when its load is zero, so a rest week reads as zero rather than vanishing.
 * Weeks that hold in-month days but start in the previous month are listed
 * too, so early-month load is not dropped.
 */
export const weeklyLoadForMonth = (
  entries: LoadEntry[],
  month: string
): { load: number; weekStart: string }[] => {
  const byWeek = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.date.startsWith(month)) {
      continue;
    }
    const weekStart = sessionWeekStart(entry.date);
    byWeek.set(
      weekStart,
      (byWeek.get(weekStart) ?? 0) + (sessionLoad(entry) ?? 0)
    );
  }

  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  if (yearText === undefined || monthText === undefined) {
    return [];
  }
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const mondays = new Set<string>();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const monday = sessionWeekStart(`${month}-${String(day).padStart(2, "0")}`);
    if (monday.startsWith(month)) {
      mondays.add(monday);
    }
  }

  const weeks = [...mondays]
    .toSorted((a, b) => a.localeCompare(b))
    .map((weekStart) => ({ load: byWeek.get(weekStart) ?? 0, weekStart }));
  for (const [weekStart, load] of byWeek) {
    if (!mondays.has(weekStart)) {
      weeks.push({ load, weekStart });
    }
  }
  return weeks.toSorted((a, b) => a.weekStart.localeCompare(b.weekStart));
};

const dailyLoads = (entries: LoadEntry[], onDate: string): number[] => {
  const loadByDate = new Map<string, number>();
  for (const entry of entries) {
    // Same-day sessions accumulate: a morning and an evening block both count.
    loadByDate.set(
      entry.date,
      (loadByDate.get(entry.date) ?? 0) + (sessionLoad(entry) ?? 0)
    );
  }
  const loads: number[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(Date.parse(onDate) - offset * DAY_MS)
      .toISOString()
      .slice(0, 10);
    loads.push(loadByDate.get(date) ?? 0);
  }
  return loads;
};

/**
 * Foster's weekly monotony: mean daily load divided by the population
 * standard deviation of the 7 daily loads ending on `onDate`. Null when the
 * week is uniform (SD 0) or carries no load at all — a number would be
 * meaningless division noise.
 */
export const monotony = (
  entries: LoadEntry[],
  onDate: string
): number | null => {
  const loads = dailyLoads(entries, onDate);
  const mean = loads.reduce((total, load) => total + load, 0) / loads.length;
  if (mean === 0) {
    return null;
  }
  const variance =
    loads.reduce((total, load) => total + (load - mean) ** 2, 0) / loads.length;
  const standardDeviation = Math.sqrt(variance);
  return standardDeviation === 0 ? null : mean / standardDeviation;
};

/** Foster's weekly strain: weekly load × monotony. Null without monotony. */
export const strain = (entries: LoadEntry[], onDate: string): number | null => {
  const weeklyMonotony = monotony(entries, onDate);
  if (weeklyMonotony === null) {
    return null;
  }
  return rollingLoad(entries, 7, onDate) * weeklyMonotony;
};
