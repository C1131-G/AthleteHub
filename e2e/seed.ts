import type { Page } from "@playwright/test";

/**
 * Seeds the browser-side collections the app reads when it runs outside
 * Electron. Records are stored as rows around a snapshot, with the ordering and
 * uniqueness values precomputed, so these fixtures have to be shaped the same
 * way `lib/local-collections.ts` writes them.
 */
export type SeedCollection =
  | "assessments"
  | "athletes"
  | "conditioningAssessments"
  | "conditioningProgrammes"
  | "equipment"
  | "monthlyCycles"
  | "monthlyReports"
  | "trainingPlans"
  | "weeklyReports";

/**
 * Only the fields the seeding itself reads are named. Fixtures carry their full
 * domain shape; the snapshot keeps every field, this type just describes what
 * the row wrapper needs to index by.
 */
export interface SeedRecord {
  assessedOn?: string;
  athleteId?: string;
  createdAt?: string;
  fullName?: string;
  id: string;
  month?: string;
  recordedAt?: string;
  startsOn?: string;
  updatedAt?: string;
  weekStart?: string;
}

const perAthleteAnd =
  (read: (record: SeedRecord) => string) => (record: SeedRecord) =>
    `${record.athleteId ?? ""}:${read(record)}`;

export const seedConfigs = {
  assessments: {
    key: "athletehub.local.assessments",
    owned: true,
    sortValue: (record) => record.assessedOn ?? "",
  },
  athletes: {
    key: "athletehub.local.athletes",
    owned: false,
    sortValue: (record) => record.fullName ?? "",
    uniqueValue: (record) => record.athleteId ?? "",
  },
  conditioningAssessments: {
    key: "athletehub.local.conditioning-assessments",
    owned: true,
    sortValue: (record) => record.assessedOn ?? "",
  },
  conditioningProgrammes: {
    key: "athletehub.local.conditioning-programmes",
    owned: true,
    sortValue: (record) => record.startsOn ?? "",
  },
  equipment: {
    key: "athletehub.local.equipment",
    owned: true,
    sortValue: (record) => record.recordedAt ?? "",
  },
  monthlyCycles: {
    key: "athletehub.local.monthly-cycles",
    owned: true,
    sortValue: (record) => record.month ?? "",
    uniqueValue: perAthleteAnd((record) => record.month ?? ""),
  },
  monthlyReports: {
    key: "athletehub.local.monthly-reports",
    owned: true,
    sortValue: (record) => record.month ?? "",
    uniqueValue: perAthleteAnd((record) => record.month ?? ""),
  },
  trainingPlans: {
    key: "athletehub.local.training-plans",
    owned: true,
    sortValue: (record) => record.startsOn ?? "",
  },
  weeklyReports: {
    key: "athletehub.local.weekly-reports",
    owned: true,
    sortValue: (record) => record.weekStart ?? "",
    uniqueValue: perAthleteAnd((record) => record.weekStart ?? ""),
  },
} satisfies Record<
  SeedCollection,
  {
    key: string;
    owned: boolean;
    sortValue: (record: SeedRecord) => string;
    uniqueValue?: (record: SeedRecord) => string;
  }
>;

/**
 * The roster the fixtures refer to by id. The app no longer invents athletes on
 * first read, so the tests have to supply the ones they reference.
 */
export const defaultAthletes: SeedRecord[] = [
  "Jatin Kumar",
  "Suryansh Singh",
  "Tanmay Sharma",
  "Roshan Verma",
  "Aryan Raj",
  "Bhawana Devi",
  "Pragya Singh",
  "Manasvi Gupta",
  "Nikita Yadav",
  "Amrita Kumari",
].map((fullName, index) => ({
  armSpanCm: 175,
  athleteId: `AH-${String(index + 1).padStart(3, "0")}`,
  category: "recurve",
  createdAt: "2026-01-01T00:00:00.000Z",
  dateOfBirth: "2005-01-01",
  equipmentNotes: "",
  fullName,
  heightCm: 170,
  id: `seed-${index + 1}`,
  status: "active",
  targetDistanceM: 70,
  targetScore: 650,
  technicalFocus: "Shot routine and release consistency",
  updatedAt: "2026-01-01T00:00:00.000Z",
  weightKg: 65,
}));

export interface SeedEntry {
  collection: SeedCollection;
  records: readonly SeedRecord[];
}

interface StoredRow {
  archivedAt: null;
  athleteId?: string;
  createdAt: string;
  id: string;
  snapshot: string;
  sortValue: string;
  uniqueValue?: string;
  updatedAt: string;
}

const toRows = (entry: SeedEntry): [string, StoredRow[]] => {
  const config = seedConfigs[entry.collection];
  const rows = entry.records.map((record) => {
    const stamp = record.createdAt ?? new Date().toISOString();
    const row: StoredRow = {
      archivedAt: null,
      createdAt: stamp,
      id: record.id,
      snapshot: JSON.stringify(record),
      sortValue: config.sortValue(record),
      updatedAt: record.updatedAt ?? stamp,
    };
    if (config.owned) {
      row.athleteId = record.athleteId ?? "";
    }
    if ("uniqueValue" in config) {
      row.uniqueValue = config.uniqueValue(record);
    }
    return row;
  });
  return [config.key, rows];
};

const withDefaultRoster = (entries: SeedEntry[]): SeedEntry[] =>
  entries.some((entry) => entry.collection === "athletes")
    ? entries
    : [...entries, { collection: "athletes", records: defaultAthletes }];

/**
 * Writes fixtures before the app boots. Also records the legacy import as done,
 * so the one-time migration prompt never covers the page under test.
 */
export const seedCollections = async (page: Page, entries: SeedEntry[]) => {
  const payload = withDefaultRoster(entries).map(toRows);
  await page.addInitScript((seeded: [string, unknown][]) => {
    for (const [key, rows] of seeded) {
      window.localStorage.setItem(key, JSON.stringify(rows));
    }
    window.localStorage.setItem(
      "athletehub.migrated.v2",
      JSON.stringify({ completedAt: new Date().toISOString() })
    );
  }, payload);
};

/** Same as `seedCollections`, but leaves anything already stored in place. */
export const seedCollectionsIfEmpty = async (
  page: Page,
  entries: SeedEntry[]
) => {
  const payload = withDefaultRoster(entries).map(toRows);
  await page.addInitScript((seeded: [string, unknown][]) => {
    for (const [key, rows] of seeded) {
      if (!window.localStorage.getItem(key)) {
        window.localStorage.setItem(key, JSON.stringify(rows));
      }
    }
    window.localStorage.setItem(
      "athletehub.migrated.v2",
      JSON.stringify({ completedAt: new Date().toISOString() })
    );
  }, payload);
};

/**
 * Writes fixtures into an already-loaded page, for tests that then reload and
 * expect whatever the app itself saved to survive.
 */
export const writeCollections = async (page: Page, entries: SeedEntry[]) => {
  const payload = withDefaultRoster(entries).map(toRows);
  await page.evaluate((seeded: [string, unknown][]) => {
    for (const [key, rows] of seeded) {
      window.localStorage.setItem(key, JSON.stringify(rows));
    }
  }, payload);
};
