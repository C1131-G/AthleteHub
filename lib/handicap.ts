/**
 * Estimated Archery GB–style handicap for a recorded round.
 *
 * The Archery GB handicap scheme is built on a model: a handicap h maps to a
 * bivariate-normal arrow dispersion whose expected ring score the published
 * tables tabulate. This module implements that model directly — arrow groups
 * are normal with a sigma that decays exponentially with the handicap — so a
 * score can be converted to a handicap by bisection without shipping 151-row
 * tables per round.
 *
 * The two constants below are calibration parameters of that curve. They
 * approximate the outer-ten Archery GB scheme (sigma ~20 mm at 70 m for the
 * best handicaps, decaying with handicap) but they are NOT the published
 * tables: anchor them against Archery GB's current tables before presenting
 * these figures as official classifications.
 */

/** Arrow dispersion in millimetres per metre of distance at handicap 0. */
const SIGMA_PER_METRE = 0.28;
/** Handicap steps over which dispersion doubles. */
const DOUBLING_STEPS = 19.4;
const MIN_HANDICAP = 0;
const MAX_HANDICAP = 150;

export interface HandicapRound {
  /** Full-round face size in centimetres. */
  faceCm: number;
  distanceM: number;
  /** Arrows counted in the round score (e.g. 72 for a WA 720). */
  roundArrows: number;
}

const sigmaMm = (handicap: number, round: HandicapRound) =>
  round.distanceM *
  SIGMA_PER_METRE *
  Math.exp((handicap / DOUBLING_STEPS) * Math.LN2);

/**
 * Expected arrow score under the outer-ten rings: ring v (v = 1…10) is the
 * annulus from (10 − v)·w to (11 − v)·w millimetres from the centre, and the
 * probability of landing inside radius r is 1 − exp(−r²/2σ²).
 */
const expectedArrowScore = (handicap: number, round: HandicapRound) => {
  const ringWidthMm = (round.faceCm * 10) / 2 / 10;
  const twoSigmaSquared = 2 * sigmaMm(handicap, round) ** 2;
  const insideProbability = (radiusMm: number) =>
    1 - Math.exp(-(radiusMm * radiusMm) / twoSigmaSquared);
  let expected = 0;
  for (let ring = 1; ring <= 10; ring += 1) {
    const outerRadius = (11 - ring) * ringWidthMm;
    const innerRadius = ring === 10 ? 0 : (10 - ring) * ringWidthMm;
    expected +=
      ring * (insideProbability(outerRadius) - insideProbability(innerRadius));
  }
  return expected;
};

const expectedRoundScore = (handicap: number, round: HandicapRound) =>
  expectedArrowScore(handicap, round) * round.roundArrows;

/**
 * Resolves the handicap whose expected round score is closest to the one shot.
 * Bisection on a monotonically decreasing curve; returns null when the score
 * lies outside the scheme (perfect score upward or no arrows).
 */
export const estimateHandicap = (
  round: HandicapRound,
  score: number
): number | null => {
  if (round.roundArrows === 0 || score <= 0) {
    return null;
  }
  const perfect = round.roundArrows * 10;
  if (score > perfect) {
    return null;
  }
  let low = MIN_HANDICAP;
  let high = MAX_HANDICAP;
  while (high - low > 0.5) {
    const middle = (low + high) / 2;
    if (expectedRoundScore(middle, round) >= score) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return Math.round((low + high) / 2);
};

/**
 * An arrow count for the round's total, when the session is a recognised
 * round of the catalogue (WA 720 shoots 72 arrows, and so on).
 */
const ROUND_ARROWS = {
  portsmouth: 60,
  "vegas-300": 30,
  "wa-1440-90": 144,
  "wa-720-60": 72,
  "wa-720-70": 72,
  "wa-720-compound-50": 72,
  "wa-indoor-18": 60,
} as const satisfies Record<string, number>;

export const roundArrowsFor = (roundId: string): number | undefined =>
  // SAFETY: unknown ids fall through the lookup to undefined, which the
  // caller already treats as "not a recognised round".
  ROUND_ARROWS[roundId as keyof typeof ROUND_ARROWS];
