import type {
  ConditioningAssessment,
  ConditioningProgramme,
  ConditioningSession,
  ConditioningTestResult,
  SessionIntensity,
} from "./conditioning-types";

/** Results match across assessments only when test key AND unit agree. */
const resultMatches = (a: ConditioningTestResult, b: ConditioningTestResult) =>
  a.key === b.key && a.unit === b.unit;

export const findPreviousAssessment = (
  assessments: ConditioningAssessment[],
  current: ConditioningAssessment
) =>
  assessments
    .filter(
      (assessment) =>
        assessment.athleteId === current.athleteId &&
        assessment.id !== current.id &&
        assessment.assessedOn <= current.assessedOn
    )
    .toSorted((a, b) => b.assessedOn.localeCompare(a.assessedOn))[0];

/**
 * The previous value for a test, resolved from the immediately preceding
 * assessment with the same test key and unit — never from the current record.
 */
export const previousResultFor = (
  assessments: ConditioningAssessment[],
  current: ConditioningAssessment,
  result: ConditioningTestResult
) => {
  const previous = findPreviousAssessment(assessments, current);
  return previous?.results.find((candidate) =>
    resultMatches(candidate, result)
  );
};

export interface ResultChange {
  direction: "better" | "worse" | "same";
  delta: number;
  previous: number | undefined;
}

/** Higher-is-better and lower-is-better tests both normalise to better/worse. */
export const resultChange = (
  assessments: ConditioningAssessment[],
  current: ConditioningAssessment,
  result: ConditioningTestResult
): ResultChange => {
  const previous = previousResultFor(assessments, current, result)?.value;
  if (previous === undefined) {
    return { delta: 0, direction: "same", previous };
  }
  const delta = result.value - previous;
  if (delta === 0) {
    return { delta, direction: "same", previous };
  }
  const improved =
    result.improvementDirection === "higher" ? delta > 0 : delta < 0;
  return { delta, direction: improved ? "better" : "worse", previous };
};

/** Seconds render as m:ss so 2 km times and holds stay human readable. */
export const formatDuration = (totalSeconds: number) => {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

/** Parses an m:ss (or bare minutes) entry into seconds; undefined if invalid. */
export const parseDuration = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return;
  }
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  const match = /^(?<minutes>\d+):(?<seconds>[0-5]\d)$/.exec(trimmed);
  return match
    ? Number(match.groups?.minutes) * 60 + Number(match.groups?.seconds)
    : undefined;
};

const SESSION_PATTERN = /^(?:recovery|rest)$/i;

export const isRecoverySession = (session: ConditioningSession) =>
  session.intensity === "recovery" || SESSION_PATTERN.test(session.type);

/** Session minutes exclude recovery days, which carry no training load. */
export const sessionMinutes = (session: ConditioningSession) => {
  if (isRecoverySession(session)) {
    return 0;
  }
  const [startHour = 0, startMinute = 0] = session.startsAt
    .split(":")
    .map(Number);
  const [endHour = 0, endMinute = 0] = session.endsAt.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return Math.max(0, end - start);
};

export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const programmeMinutesByIntensity = (
  programme: ConditioningProgramme
) => {
  const totals = new Map<SessionIntensity, number>();
  for (const session of programme.sessions) {
    const minutes = sessionMinutes(session);
    if (!minutes) {
      continue;
    }
    totals.set(
      session.intensity,
      (totals.get(session.intensity) ?? 0) + minutes
    );
  }
  return [...totals.entries()]
    .map(([intensity, minutes]) => ({ intensity, minutes }))
    .toSorted((a, b) => a.intensity.localeCompare(b.intensity));
};

export const latestAssessmentFor = (
  assessments: ConditioningAssessment[],
  athleteId: string,
  month: string
) =>
  assessments
    .filter(
      (assessment) =>
        assessment.athleteId === athleteId &&
        assessment.assessedOn.startsWith(month)
    )
    .toSorted((a, b) => b.assessedOn.localeCompare(a.assessedOn))[0];

export const activeProgrammeFor = (
  programmes: ConditioningProgramme[],
  athleteId: string,
  month: string
) => {
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;
  return programmes
    .filter(
      (programme) =>
        programme.athleteId === athleteId &&
        programme.status === "active" &&
        programme.startsOn <= monthEnd &&
        programme.endsOn >= monthStart
    )
    .toSorted((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
};

/** Two active ranges for one athlete overlap when each starts before the other ends. */
export const overlappingActiveProgramme = (
  programmes: ConditioningProgramme[],
  athleteId: string,
  startsOn: string,
  endsOn: string,
  ignoreId?: string
) =>
  programmes.some(
    (programme) =>
      programme.id !== ignoreId &&
      programme.athleteId === athleteId &&
      programme.status === "active" &&
      startsOn <= programme.endsOn &&
      endsOn >= programme.startsOn
  );

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysUntil = (fromIso: string, untilIso: string) =>
  Math.round((Date.parse(untilIso) - Date.parse(fromIso)) / DAY_MS);

/** True when the athlete has no assessment for the given month at all. */
export const missingMonthlyAssessment = (
  assessments: ConditioningAssessment[],
  athleteId: string,
  month: string
) => !latestAssessmentFor(assessments, athleteId, month);
