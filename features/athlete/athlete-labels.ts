import type { AthleteStatus, BowCategory } from "./athlete-types";

/**
 * Display names for the stored enums. `satisfies` keeps a new variant a compile
 * error rather than a blank cell.
 */
export const statusLabel = {
  active: "Active",
  inactive: "Inactive",
  "medical-leave": "Medical leave",
} satisfies Record<AthleteStatus, string>;

export const categoryLabel = {
  barebow: "Barebow",
  compound: "Compound",
  recurve: "Recurve",
} satisfies Record<BowCategory, string>;
