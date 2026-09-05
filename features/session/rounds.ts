import type { SessionFormat } from "./session-types";

/**
 * Named rounds pre-fill a session's format. Rounds sit alongside freehand
 * logging: a session recorded without one keeps `roundId` unset and behaves
 * exactly as before.
 */
export interface RoundDefinition {
  arrowsPerEnd: number;
  distanceM: number;
  id: string;
  indoor: boolean;
  label: string;
  maxScorePerArrow: number;
  targetFaceCm: number;
}

export const roundCatalogue = [
  {
    arrowsPerEnd: 6,
    distanceM: 90,
    id: "wa-1440-90",
    indoor: false,
    label: "WA 1440 — 90 m stage (122 cm face)",
    maxScorePerArrow: 10,
    targetFaceCm: 122,
  },
  {
    arrowsPerEnd: 6,
    distanceM: 70,
    id: "wa-720-70",
    indoor: false,
    label: "WA 720 — 70 m (122 cm face)",
    maxScorePerArrow: 10,
    targetFaceCm: 122,
  },
  {
    arrowsPerEnd: 6,
    distanceM: 60,
    id: "wa-720-60",
    indoor: false,
    label: "WA 720 — 60 m (122 cm face)",
    maxScorePerArrow: 10,
    targetFaceCm: 122,
  },
  {
    arrowsPerEnd: 6,
    distanceM: 50,
    id: "wa-720-compound-50",
    indoor: false,
    label: "WA 720 — 50 m compound (80 cm face)",
    maxScorePerArrow: 10,
    targetFaceCm: 80,
  },
  {
    arrowsPerEnd: 3,
    distanceM: 18.29,
    id: "portsmouth",
    indoor: true,
    label: "Portsmouth — 20 yd (60 cm face)",
    maxScorePerArrow: 10,
    targetFaceCm: 60,
  },
  {
    arrowsPerEnd: 3,
    distanceM: 18,
    id: "wa-indoor-18",
    indoor: true,
    label: "WA Indoor — 18 m (40 cm face)",
    maxScorePerArrow: 10,
    targetFaceCm: 40,
  },
  {
    arrowsPerEnd: 3,
    distanceM: 18,
    id: "vegas-300",
    indoor: true,
    label: "Vegas 300 — 18 m (40 cm face)",
    maxScorePerArrow: 10,
    targetFaceCm: 40,
  },
] as const satisfies readonly RoundDefinition[];

export const roundById = (id: string): RoundDefinition | undefined =>
  roundCatalogue.find((round) => round.id === id);

/**
 * The format fields a round owns; the bow category stays with the athlete, so
 * applying a round never touches it.
 */
export const applyRound = (
  round: RoundDefinition
): Pick<
  SessionFormat,
  | "arrowsPerEnd"
  | "distanceM"
  | "indoor"
  | "maxScorePerArrow"
  | "roundId"
  | "targetFaceCm"
> => ({
  arrowsPerEnd: round.arrowsPerEnd,
  distanceM: round.distanceM,
  indoor: round.indoor,
  maxScorePerArrow: round.maxScorePerArrow,
  roundId: round.id,
  targetFaceCm: round.targetFaceCm,
});
