import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { z } from "zod";

/**
 * App-wide preferences, stored as JSON in userData and owned by the Settings
 * page. Every field catches its own invalid value, so a hand-edited or
 * partially written file degrades to defaults per field instead of taking the
 * whole file down — the same graceful-degradation rule the collections use.
 */
export const preferencesSchema = z.object({
  backupCount: z.number().int().min(1).max(30).catch(7),
  rankingDistance: z.number().positive().catch(70),
  weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]).catch(1),
});

export type AppPreferences = z.infer<typeof preferencesSchema>;

export const DEFAULT_PREFERENCES: AppPreferences = preferencesSchema.parse({});

export const readPreferencesFile = (filePath: string): AppPreferences => {
  try {
    if (!existsSync(filePath)) {
      return DEFAULT_PREFERENCES;
    }
    return preferencesSchema.parse(JSON.parse(readFileSync(filePath, "utf-8")));
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const writePreferencesFile = (
  filePath: string,
  partial: Partial<AppPreferences>
): AppPreferences => {
  const merged = preferencesSchema.parse({
    ...readPreferencesFile(filePath),
    ...partial,
  });
  writeFileSync(filePath, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
};
