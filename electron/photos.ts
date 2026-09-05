import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

const photoSaveInputSchema = z.object({
  athleteId: z.string().regex(/^[a-z0-9-]+$/i),
  dataUrl: z
    .string()
    .regex(
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/,
      "Only PNG, JPEG, or WebP images are supported."
    ),
});

const photoNameSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*\.(?:png|jpg|webp)$/, "Invalid photo.");

const MIME_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
} as const;

const EXTENSION_BY_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
} as const satisfies Record<string, string>;

/**
 * Stores athlete photos as files under userData; the athlete snapshot keeps
 * the returned file name. Photos are written and read only through this
 * store, whose callers are the session-gated IPC handlers.
 */
export const createPhotoStore = (directory: string) => ({
  read(name: unknown): string {
    const parsedName = photoNameSchema.parse(name);
    // SAFETY: the name schema guarantees a PNG/JPG/WebP extension, which is
    // exactly the key set of MIME_BY_EXTENSION.
    const mime =
      MIME_BY_EXTENSION[
        path.extname(parsedName) as keyof typeof MIME_BY_EXTENSION
      ];
    return `data:${mime};base64,${readFileSync(
      path.join(directory, parsedName)
    ).toString("base64")}`;
  },
  save(input: unknown): string {
    const parsed = photoSaveInputSchema.parse(input);
    const match =
      /^data:(?<mime>image\/(?:png|jpeg|webp));base64,(?<data>[A-Za-z0-9+/=]+)$/.exec(
        parsed.dataUrl
      );
    const data = match?.groups?.data;
    const mime = match?.groups?.mime;
    if (data === undefined || mime === undefined) {
      throw new Error("Only PNG, JPEG, or WebP images are supported.");
    }
    // SAFETY: the data-URL schema only admits the three image MIME types
    // that are exactly the key set of EXTENSION_BY_MIME.
    const extension = EXTENSION_BY_MIME[mime as keyof typeof EXTENSION_BY_MIME];
    const name = `${parsed.athleteId.toLowerCase()}-${Date.now()}${extension}`;
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, name), Buffer.from(data, "base64"));
    return name;
  },
});
