import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { z } from "zod";

/**
 * Where AthleteHub's database and rolling backups live, chosen once during
 * first-run setup (electron/login.html) and changeable later from Settings.
 * Unlike electron/preferences.ts, an invalid or missing file means "not
 * configured yet" (null) rather than a set of defaults — callers must be able
 * to tell "no choice made" apart from "chose a folder that happens to match
 * the default".
 */
export const locationConfigSchema = z.object({
  backupPath: z.string().min(1),
  storagePath: z.string().min(1),
});

export type LocationConfig = z.infer<typeof locationConfigSchema>;

export const readLocationConfig = (filePath: string): LocationConfig | null => {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const parsed = locationConfigSchema.safeParse(
      JSON.parse(readFileSync(filePath, "utf-8"))
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const writeLocationConfig = (
  filePath: string,
  config: LocationConfig
): LocationConfig => {
  const validated = locationConfigSchema.parse(config);
  writeFileSync(filePath, JSON.stringify(validated, null, 2), "utf-8");
  return validated;
};
