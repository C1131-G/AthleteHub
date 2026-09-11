// Renders the app icon sources in build-resources/ into the files
// electron-builder consumes: a 1024px PNG (macOS/Linux) and a multi-size
// Windows ICO. Sizes at or below 48px use icon-small.svg, whose dial ticks and
// third target ring are dropped because they turn to noise that small.
//
// Run with: node scripts/build-icons.mjs
import { Buffer } from "node:buffer";
import { writeFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

const root = path.join(import.meta.dirname, "..");
const resources = path.join(root, "build-resources");
const detailed = path.join(resources, "icon.svg");
const simplified = path.join(resources, "icon-small.svg");

const SIMPLIFY_AT_OR_BELOW = 48;
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const ICO_DIR_HEADER_BYTES = 6;
const ICO_ENTRY_BYTES = 16;

/** ICO stores 256 as 0 in its single-byte width/height fields. */
const icoDimension = (size) => (size >= 256 ? 0 : size);

const render = (size) =>
  sharp(size <= SIMPLIFY_AT_OR_BELOW ? simplified : detailed, { density: 512 })
    .resize(size, size)
    .png()
    .toBuffer();

/**
 * ICONDIR header, then one 16-byte ICONDIRENTRY per image, then the PNG
 * payloads. Offsets are absolute from the start of the file, so they can only
 * be filled in once the header and every entry has been sized.
 */
const buildIco = (images) => {
  const header = Buffer.alloc(ICO_DIR_HEADER_BYTES);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = ICO_DIR_HEADER_BYTES + images.length * ICO_ENTRY_BYTES;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(ICO_ENTRY_BYTES);
    entry.writeUInt8(icoDimension(size), 0);
    entry.writeUInt8(icoDimension(size), 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([
    header,
    ...entries,
    ...images.map((image) => image.data),
  ]);
};

const main = async () => {
  await sharp(detailed, { density: 1024 })
    .resize(1024, 1024)
    .png()
    .toFile(path.join(resources, "icon.png"));

  const images = await Promise.all(
    ICO_SIZES.map(async (size) => ({ data: await render(size), size }))
  );
  writeFileSync(path.join(resources, "icon.ico"), buildIco(images));

  process.stdout.write(`icon.png 1024x1024, icon.ico ${ICO_SIZES.join("/")}\n`);
};

await main();
