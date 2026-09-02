export const standardEquipmentItems = [
  ["riser", "Handle / riser"],
  ["limbs", "Limbs"],
  ["sight", "Sight"],
  ["sight-pin", "Sight pin"],
  ["stabilizer-set", "Stabilizer set"],
  ["long-bar", "Long bar"],
  ["short-bar", "Short bar"],
  ["extension", "Extension"],
  ["v-bar", "V-bar"],
  ["arrow", "Arrow"],
  ["point", "Point"],
  ["nock", "Nock"],
  ["fletches", "Fletches"],
  ["finger-tab", "Finger tab"],
  ["plunger", "Plunger"],
  ["arrow-rest", "Arrow rest"],
  ["clicker", "Clicker"],
  ["quiver", "Quiver"],
  ["chest-guard", "Chest guard"],
] as const;

export type StandardEquipmentKey = (typeof standardEquipmentItems)[number][0];

export interface EquipmentItem {
  id: string;
  key: string;
  label: string;
  value: string;
  requirement: string;
  custom: boolean;
}

export interface EquipmentSetup {
  id: string;
  athleteId: string;
  recordedAt: string;
  items: EquipmentItem[];
  coachNotes: string;
  createdAt: string;
  updatedAt: string;
}

export type EquipmentSetupInput = Omit<
  EquipmentSetup,
  "id" | "createdAt" | "updatedAt"
>;

export const createEquipmentItems = (source?: EquipmentItem[]) =>
  standardEquipmentItems.map(([key, label]) => {
    const existing = source?.find((item) => item.key === key);
    return {
      custom: false,
      // Standard keys are unique, so the id stays stable across renders.
      id: existing?.id ?? key,
      key,
      label,
      requirement: existing?.requirement ?? "",
      value: existing?.value ?? "",
    } satisfies EquipmentItem;
  });

export const cloneEquipmentItems = (items: EquipmentItem[]) =>
  items.map((item) => ({ ...item }));
