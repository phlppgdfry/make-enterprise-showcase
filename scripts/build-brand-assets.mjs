import fs from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
const directory = path.resolve(import.meta.dirname, "../production/public");
export function buildBrandAssets() {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#173a31"/><path d="M16 46V19l16 16 16-16v27" fill="none" stroke="#c9ed80" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><g fill="#f5f6f0" stroke="#173a31" stroke-width="2"><circle cx="16" cy="19" r="5"/><circle cx="32" cy="35" r="5"/><circle cx="48" cy="19" r="5"/></g></svg>\n';
  fs.writeFileSync(directory + "/favicon.svg", svg);
  fs.writeFileSync(directory + "/brand-mark.svg", svg);
  const crc = (buffer) => {
    let c = 0xffffffff;
    for (const b of buffer) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (name, data) => {
    const type = Buffer.from(name),
      length = Buffer.alloc(4),
      checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    checksum.writeUInt32BE(crc(Buffer.concat([type, data])));
    return Buffer.concat([length, type, data, checksum]);
  };
  const segments = [
    [16, 46, 16, 19],
    [16, 19, 32, 35],
    [32, 35, 48, 19],
    [48, 19, 48, 46],
  ];
  const distance = (x, y, [a, b, c, d]) => {
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - a) * (c - a) + (y - b) * (d - b)) / ((c - a) ** 2 + (d - b) ** 2),
      ),
    );
    return Math.hypot(x - a - t * (c - a), y - b - t * (d - b));
  };
  const color = (x, y) => {
    const dx = Math.max(14 - x, 0, x - 50),
      dy = Math.max(14 - y, 0, y - 50);
    if (Math.hypot(dx, dy) > 14) return [0, 0, 0, 0];
    for (const [a, b] of [
      [16, 19],
      [32, 35],
      [48, 19],
    ]) {
      const r = Math.hypot(x - a, y - b);
      if (r <= 4) return [245, 246, 240, 255];
      if (r <= 6) return [23, 58, 49, 255];
    }
    if (segments.some((s) => distance(x, y, s) <= 3))
      return [201, 237, 128, 255];
    return [23, 58, 49, 255];
  };
  const png = (size) => {
    const raw = Buffer.alloc((size * 4 + 1) * size),
      samples = size <= 192 ? 4 : 2;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const sum = [0, 0, 0, 0];
        for (let j = 0; j < samples; j++)
          for (let i = 0; i < samples; i++) {
            const c = color(
              ((x + (i + 0.5) / samples) * 64) / size,
              ((y + (j + 0.5) / samples) * 64) / size,
            );
            for (let k = 0; k < 4; k++) sum[k] += c[k];
          }
        for (let k = 0; k < 4; k++)
          raw[y * (size * 4 + 1) + 1 + x * 4 + k] = Math.round(
            k === 3
              ? sum[k] / samples ** 2
              : sum[3]
                ? (sum[k] * 255) / sum[3]
                : 0,
          );
      }
    const h = Buffer.alloc(13);
    h.writeUInt32BE(size);
    h.writeUInt32BE(size, 4);
    h[8] = 8;
    h[9] = 6;
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", h),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  };
  for (const [size, name] of [
    [180, "apple-touch-icon.png"],
    [192, "icon-192.png"],
    [512, "icon-512.png"],
  ])
    fs.writeFileSync(path.join(directory, name), png(size));
  const sizes = [16, 32, 48],
    images = sizes.map(png),
    header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const entries = images.map((image, i) => {
    const entry = Buffer.alloc(16);
    entry[0] = sizes[i];
    entry[1] = sizes[i];
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.length;
    return entry;
  });
  fs.writeFileSync(
    directory + "/favicon.ico",
    Buffer.concat([header, ...entries, ...images]),
  );
  const reference = path.resolve(import.meta.dirname, "../docs/assets/brand");
  fs.mkdirSync(reference, { recursive: true });
  for (const name of [
    "favicon.svg",
    "favicon.ico",
    "apple-touch-icon.png",
    "brand-mark.svg",
    "share-preview.png",
  ])
    if (fs.existsSync(path.join(directory, name)))
      fs.copyFileSync(path.join(directory, name), path.join(reference, name));
}
if (process.argv[1] === import.meta.filename) {
  buildBrandAssets();
  console.log("Deterministic SVG, ICO and touch icons generated.");
}
