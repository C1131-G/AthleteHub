import { z } from "zod";

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

export const equipmentItemSchema = z.object({
  custom: z.boolean(),
  id: z.string().min(1),
  key: z.string().min(1),
  label: z.string(),
  requirement: z.string(),
  value: z.string(),
});

export const equipmentSetupSchema = z.object({
  athleteId: z.string().min(1),
  coachNotes: z.string(),
  createdAt: z.string().min(1),
  id: z.string().min(1),
  items: z.array(equipmentItemSchema),
  recordedAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const equipmentSetupInputSchema = equipmentSetupSchema.omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export type EquipmentItem = z.infer<typeof equipmentItemSchema>;
export type EquipmentSetup = z.infer<typeof equipmentSetupSchema>;
export type EquipmentSetupInput = z.infer<typeof equipmentSetupInputSchema>;

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
