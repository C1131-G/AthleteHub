/**
 * Typed route builders for the conditioning workspace. The literal template
 * types let `next/link` verify these against the route map.
 */
const CONDITIONING_ROOT = "/conditioning";

export const conditioningHref = (athleteId?: string) =>
  athleteId
    ? (`${CONDITIONING_ROOT}?athleteId=${encodeURIComponent(athleteId)}` as const)
    : CONDITIONING_ROOT;

export const conditioningNewAssessmentHref = (athleteId: string) =>
  `${CONDITIONING_ROOT}/assessments/new?athleteId=${encodeURIComponent(athleteId)}` as const;

export const conditioningAssessmentHref = (assessmentId: string) =>
  `${CONDITIONING_ROOT}/assessments/${assessmentId}` as const;

export const conditioningAssessmentEditHref = (assessmentId: string) =>
  `${CONDITIONING_ROOT}/assessments/${assessmentId}/edit` as const;

export const conditioningNewProgrammeHref = (athleteId: string) =>
  `${CONDITIONING_ROOT}/programmes/new?athleteId=${encodeURIComponent(athleteId)}` as const;

export const conditioningProgrammeHref = (programmeId: string) =>
  `${CONDITIONING_ROOT}/programmes/${programmeId}` as const;

export const conditioningProgrammeEditHref = (programmeId: string) =>
  `${CONDITIONING_ROOT}/programmes/${programmeId}/edit` as const;
