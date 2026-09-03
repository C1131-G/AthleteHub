import type { Athlete } from "@/features/athlete/athlete-types";

import {
  activeProgrammeFor,
  daysUntil,
  latestAssessmentFor,
} from "./conditioning-calculations";
import type {
  ConditioningAssessment,
  ConditioningProgramme,
} from "./conditioning-types";

export interface ConditioningAttentionRow {
  href: `/conditioning?athleteId=${string}`;
  reason: string;
}

/** Any current result that scored worse than its previous comparable value. */
const hasDecliningResults = (
  assessments: ConditioningAssessment[],
  latest: ConditioningAssessment
) => {
  const candidates = assessments
    .filter(
      (candidate) =>
        candidate.athleteId === latest.athleteId &&
        candidate.id !== latest.id &&
        candidate.assessedOn <= latest.assessedOn
    )
    .toSorted((a, b) => b.assessedOn.localeCompare(a.assessedOn));
  const [prior] = candidates;
  if (!prior) {
    return false;
  }
  return latest.results.some((result) => {
    const previous = prior.results.find(
      (candidate) =>
        candidate.key === result.key && candidate.unit === result.unit
    );
    if (!previous) {
      return false;
    }
    const delta = result.value - previous.value;
    if (delta === 0) {
      return false;
    }
    return result.improvementDirection === "higher" ? delta < 0 : delta > 0;
  });
};

const PROGRAMME_ENDING_SOON_DAYS = 14;

/**
 * Dashboard attention states driven by conditioning records: a missing monthly
 * assessment, declining results, active medical restrictions, a missing
 * programme, and a programme that ends soon.
 */
export const conditioningAttentionRows = (
  athlete: Athlete,
  assessments: ConditioningAssessment[],
  programmes: ConditioningProgramme[],
  month: string
): ConditioningAttentionRow[] => {
  const rows: ConditioningAttentionRow[] = [];
  const href = `/conditioning?athleteId=${athlete.id}` as const;
  const athleteAssessments = assessments.filter(
    (assessment) => assessment.athleteId === athlete.id
  );
  const latest = latestAssessmentFor(athleteAssessments, athlete.id, month);

  if (!latest) {
    rows.push({ href, reason: "Conditioning assessment missing" });
  } else if (hasDecliningResults(athleteAssessments, latest)) {
    rows.push({ href, reason: "Conditioning results declining" });
  }
  if (
    latest?.restrictionNotes.trim() ||
    athleteAssessments.some(
      (assessment) =>
        assessment.status === "medical-exemption" &&
        assessment.assessedOn.startsWith(month)
    )
  ) {
    rows.push({ href, reason: "Active medical restriction" });
  }
  const active = activeProgrammeFor(programmes, athlete.id, month);
  const [year = 0, monthNumber = 0] = month.split("-").map(Number);
  const monthEnd =
    Number.isInteger(year) && Number.isInteger(monthNumber)
      ? `${month}-${String(new Date(Date.UTC(year, monthNumber - 1, 0)).getUTCDate()).padStart(2, "0")}`
      : `${month}-28`;
  if (!active) {
    rows.push({ href, reason: "No active conditioning programme" });
  } else if (daysUntil(monthEnd, active.endsOn) <= PROGRAMME_ENDING_SOON_DAYS) {
    rows.push({ href, reason: "Conditioning programme ending soon" });
  }
  return rows;
};
