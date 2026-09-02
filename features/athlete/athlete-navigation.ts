/**
 * Every athlete route is one level deeper than the one it came from, so the
 * shell derives its back target from the URL instead of each page passing one.
 */
export type AthleteRoute = "/athletes" | `/athletes/${string}`;

export interface AthleteBackTarget {
  href: AthleteRoute;
  label: string;
}

const ATHLETES_ROOT = "/athletes";
const EDIT_SEGMENT = "edit";
const EDIT_PATH_DEPTH = 3;

export const resolveAthleteBackTarget = (
  pathname: string
): AthleteBackTarget | undefined => {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "athletes" || segments.length < 2) {
    return undefined;
  }

  if (
    segments.length === EDIT_PATH_DEPTH &&
    segments[EDIT_PATH_DEPTH - 1] === EDIT_SEGMENT
  ) {
    return {
      href: `${ATHLETES_ROOT}/${segments[1]}`,
      label: "Back to profile",
    };
  }

  return { href: ATHLETES_ROOT, label: "Back to athletes" };
};
