import type { SightMark } from "./sight-mark-types";

/**
 * A sight mark for an unrecorded distance, interpolated between the two
 * recorded marks that bracket it. Sight scales are close to linear between
 * marks, so the estimate is a straight two-point interpolation; outside the
 * recorded range there is nothing to interpolate from and the nearest mark is
 * returned as a starting point instead of a made-up one.
 */
export const interpolateMark = (
  marks: SightMark[],
  bow: string,
  arrow: string,
  distanceM: number
): { distanceM: number; mark: string } | undefined => {
  const known = marks
    .filter(
      (mark) =>
        mark.bow === bow &&
        mark.arrow === arrow &&
        Number.isFinite(mark.distanceM) &&
        mark.distanceM > 0
    )
    .toSorted((a, b) => a.distanceM - b.distanceM);
  if (known.length === 0) {
    return undefined;
  }

  const exact = known.find((mark) => mark.distanceM === distanceM);
  if (exact) {
    return { distanceM, mark: exact.mark };
  }

  let lower: SightMark | undefined;
  for (const mark of known) {
    if (mark.distanceM < distanceM) {
      lower = mark;
    }
  }
  const upper = known.find((mark) => mark.distanceM > distanceM);
  if (!lower || !upper) {
    // Outside the recorded range: the nearest mark is the honest answer.
    const nearest = lower ?? upper;
    return nearest ? { distanceM, mark: nearest.mark } : undefined;
  }

  const span = upper.distanceM - lower.distanceM;
  const ratio = (distanceM - lower.distanceM) / span;
  const low = Number(lower.mark);
  const high = Number(upper.mark);
  if (Number.isNaN(low) || Number.isNaN(high)) {
    return { distanceM, mark: lower.mark };
  }
  return { distanceM, mark: (low + ratio * (high - low)).toFixed(2) };
};
