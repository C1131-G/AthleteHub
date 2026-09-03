/**
 * Typed route builders. The literal template types let `next/link` verify these
 * against the route map without an assertion at each call site.
 */
const PLANS_ROOT = "/training-plans";

export const trainingPlansHref = (athleteId?: string) =>
  athleteId
    ? (`${PLANS_ROOT}?athleteId=${encodeURIComponent(athleteId)}` as const)
    : PLANS_ROOT;

export const trainingPlanNewHref = () => `${PLANS_ROOT}/new` as const;

export const trainingPlanHref = (planId: string) =>
  `${PLANS_ROOT}/${planId}` as const;

export const trainingPlanEditHref = (planId: string) =>
  `${PLANS_ROOT}/${planId}/edit` as const;
