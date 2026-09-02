/**
 * Typed route builders. The literal template types let `next/link` verify these
 * against the route map without an assertion at each call site.
 */
const EQUIPMENT_ROOT = "/athletes/equipment";

export const equipmentHref = (athleteId?: string) =>
  athleteId
    ? (`${EQUIPMENT_ROOT}?athleteId=${encodeURIComponent(athleteId)}` as const)
    : EQUIPMENT_ROOT;

export const equipmentNewHref = (athleteId: string) =>
  `/athletes/${athleteId}/equipment/new` as const;

export const equipmentSetupHref = (athleteId: string, setupId: string) =>
  `/athletes/${athleteId}/equipment/${setupId}` as const;

export const equipmentSetupEditHref = (athleteId: string, setupId: string) =>
  `/athletes/${athleteId}/equipment/${setupId}/edit` as const;

export const athleteHref = (athleteId: string) =>
  `/athletes/${athleteId}` as const;
