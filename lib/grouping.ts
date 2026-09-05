/**
 * Target-face group analytics for plotted arrows. Coordinates are the
 * normalised −1…1 target-face space stored on each arrow: the origin is the
 * aiming point, +x is right, +y is up, and one unit is the face radius.
 */
export interface GroupPoint {
  x: number;
  y: number;
}

export interface GroupStats {
  /** Average arrow position; its offset from the origin is the bias. */
  centroid: GroupPoint;
  /** Mean distance from the centroid — how tight the group is. */
  meanRadius: number;
  /** Largest distance between any two arrows — the extreme spread. */
  groupSize: number;
}

const distance = (a: GroupPoint, b: GroupPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const computeGroupStats = (
  points: GroupPoint[]
): GroupStats | undefined => {
  if (points.length === 0) {
    return undefined;
  }

  const centroid = {
    x: points.reduce((total, point) => total + point.x, 0) / points.length,
    y: points.reduce((total, point) => total + point.y, 0) / points.length,
  };
  const meanRadius =
    points.reduce((total, point) => total + distance(point, centroid), 0) /
    points.length;
  let groupSize = 0;
  for (const [index, a] of points.entries()) {
    for (const b of points.slice(index + 1)) {
      groupSize = Math.max(groupSize, distance(a, b));
    }
  }

  return { centroid, groupSize, meanRadius };
};

/**
 * A readable summary of where the group sits relative to the aiming point,
 * for coach-facing copy like "groups low-left". A centroid within the
 * deadband is on call and reports no direction.
 */
const DIRECTION_DEADBAND = 0.05;

export const describeBias = (centroid: GroupPoint): string => {
  const directions: string[] = [];
  if (centroid.x > DIRECTION_DEADBAND) {
    directions.push("right");
  } else if (centroid.x < -DIRECTION_DEADBAND) {
    directions.push("left");
  }
  if (centroid.y > DIRECTION_DEADBAND) {
    directions.push("high");
  } else if (centroid.y < -DIRECTION_DEADBAND) {
    directions.push("low");
  }
  if (directions.length === 0) {
    return "centred on the aiming point";
  }
  return `groups ${directions.join(" and ")} of the aiming point`;
};
