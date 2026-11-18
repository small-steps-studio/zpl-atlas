'use strict';
// Draws media/icon.png (128 x 128): the product's own motif from scripts/icon-spec.json on a rounded tile. Drawn with 4x4
// supersampling and written as a PNG with only IHDR, IDAT and IEND chunks (no text or tool metadata).
//   node scripts/make-icon.js [output.png]

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const SIZE = 128;
const SS = 4;

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, function (_, n) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
}

// The product's own motif: scripts/icon-spec.json holds the tile colour, a palette and rows of rounded bars
// ({ "background": "#rrggbb", "colors": { "a": "#rrggbb", ... }, "rows": [[y, [[x0, x1, "a"], ...]], ...], "barHeight": 9,
//    "guide": { "x": 101, "color": "b" } (optional dashed vertical line) }).
const SPEC = JSON.parse(fs.readFileSync(path.join(__dirname, 'icon-spec.json'), 'utf8'));
const BG = hex(SPEC.background);
const COLORS = {};
for (const k of Object.keys(SPEC.colors)) COLORS[k] = hex(SPEC.colors[k]);
const BAR = SPEC.barHeight || 9;

function shade(x, y) {
  if (!inRoundRect(x, y, 4, 4, 124, 124, 22)) return null;
  const g = SPEC.guide;
  if (g && x >= g.x && x <= g.x + 3 && y >= 20 && y <= 110 && Math.floor((y - 20) / 7) % 2 === 0) return COLORS[g.color];
  for (const row of SPEC.rows) {
    const y0 = row[0];
    if (y < y0 || y > y0 + BAR) continue;
    for (const seg of row[1]) if (inRoundRect(x, y, seg[0], y0, seg[1], y0 + BAR, Math.min(3, BAR / 2))) return COLORS[seg[2]];
  }
  return BG;
}

function render() {
  const rows = [];
  for (let y = 0; y < SIZE; y++) {
    const row = Buffer.alloc(1 + SIZE * 4);
    row[0] = 0;
    for (let x = 0; x < SIZE; x++) {
      let r = 0; let g = 0; let b = 0; let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = shade(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
      const o = 1 + x * 4;
      if (a) { row[o] = Math.round(r / a); row[o + 1] = Math.round(g / a); row[o + 2] = Math.round(b / a); }
      row[o + 3] = Math.round(255 * a / (SS * SS));
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

if (require.main === module) {
  const out = process.argv[2] || path.join(__dirname, '..', 'media', 'icon.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render());
  process.stdout.write('icon written: ' + out + '\n');
}

module.exports = { render: render };
