'use strict';

/**
 * Ameilia AI — Authentic MS Paint Pixel-Art Asset Generator
 * Inspired by Skribbl.io and Jeoparty.io
 * Generates crisp, un-antialiased PNG sprite sheets & doodle wallpaper tiles in public/assets/
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUT_DIR = path.join(__dirname, '..', 'public', 'assets');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(typeStr, dataBuf) {
  const typeBuf = Buffer.from(typeStr, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);
  const crcInput = Buffer.concat([typeBuf, dataBuf]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  fillAll(rgba) {
    for (let i = 0; i < this.width * this.height; i++) {
      const o = i * 4;
      this.data[o] = rgba[0];
      this.data[o + 1] = rgba[1];
      this.data[o + 2] = rgba[2];
      this.data[o + 3] = rgba[3];
    }
  }

  setPixel(x, y, rgba) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    const o = (iy * this.width + ix) * 4;
    this.data[o] = rgba[0];
    this.data[o + 1] = rgba[1];
    this.data[o + 2] = rgba[2];
    this.data[o + 3] = rgba[3];
  }

  getPixel(x, y) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) {
      return [0, 0, 0, 0];
    }
    const o = (iy * this.width + ix) * 4;
    return [this.data[o], this.data[o + 1], this.data[o + 2], this.data[o + 3]];
  }

  brush(cx, cy, radius, rgba) {
    const ix = Math.round(cx);
    const iy = Math.round(cy);
    const r = Math.max(0, radius);
    const rCeil = Math.ceil(r);
    const rSq = r * r + 0.25;
    for (let dy = -rCeil; dy <= rCeil; dy++) {
      for (let dx = -rCeil; dx <= rCeil; dx++) {
        if (dx * dx + dy * dy <= rSq) {
          this.setPixel(ix + dx, iy + dy, rgba);
        }
      }
    }
  }

  line(x0, y0, x1, y1, radius, rgba) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.brush(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, rgba);
    }
  }

  polyline(pts, radius, rgba, closed = false) {
    for (let i = 0; i < pts.length - 1; i++) {
      this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], radius, rgba);
    }
    if (closed && pts.length > 2) {
      const last = pts[pts.length - 1];
      this.line(last[0], last[1], pts[0][0], pts[0][1], radius, rgba);
    }
  }

  quadCurve(x0, y0, cx, cy, x1, y1, radius, rgba) {
    const steps = 40;
    let px = x0;
    let py = y0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const nx = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      const ny = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      this.line(px, py, nx, ny, radius, rgba);
      px = nx;
      py = ny;
    }
  }

  ovalOutline(cx, cy, rx, ry, radius, rgba, wobbleSeed = 0) {
    const steps = 48;
    let prev = null;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const wob = wobbleSeed !== 0 ? Math.sin(a * 3 + wobbleSeed) * 0.55 : 0;
      const x = cx + Math.cos(a) * (rx + wob);
      const y = cy + Math.sin(a) * (ry - wob * 0.5);
      if (prev) this.line(prev[0], prev[1], x, y, radius, rgba);
      prev = [x, y];
    }
  }

  fillRect(x, y, w, h, rgba) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        this.setPixel(px, py, rgba);
      }
    }
  }

  floodFill(sx, sy, fillRgba) {
    const startX = Math.round(sx);
    const startY = Math.round(sy);
    if (startX < 0 || startY < 0 || startX >= this.width || startY >= this.height) return;
    const target = this.getPixel(startX, startY);
    if (
      target[0] === fillRgba[0] &&
      target[1] === fillRgba[1] &&
      target[2] === fillRgba[2] &&
      target[3] === fillRgba[3]
    ) {
      return;
    }

    const match = (ix, iy) => {
      const o = (iy * this.width + ix) * 4;
      return (
        this.data[o] === target[0] &&
        this.data[o + 1] === target[1] &&
        this.data[o + 2] === target[2] &&
        this.data[o + 3] === target[3]
      );
    };

    const stack = [[startX, startY]];
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
      if (!match(x, y)) continue;
      this.setPixel(x, y, fillRgba);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  blitFrom(src, dstX, dstY) {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const p = src.getPixel(x, y);
        if (p[3] > 0) {
          this.setPixel(dstX + x, dstY + y, p);
        }
      }
    }
  }

  toPNG() {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const stride = this.width * 4 + 1;
    const raw = Buffer.alloc(stride * this.height);
    for (let y = 0; y < this.height; y++) {
      const rowStart = y * stride;
      raw[rowStart] = 0;
      const srcStart = y * this.width * 4;
      Buffer.from(this.data.buffer, srcStart, this.width * 4).copy(raw, rowStart + 1);
    }

    const compressed = zlib.deflateSync(raw, { level: 9 });
    return Buffer.concat([
      signature,
      makeChunk('IHDR', ihdr),
      makeChunk('IDAT', compressed),
      makeChunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

function hex(h, a = 255) {
  const s = h.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
    a,
  ];
}

const BLACK = [0, 0, 0, 255];
const WHITE = [255, 255, 255, 255];

function drawDoubleStrokeGlyph(canvas, drawFn, colorRgba, outerR = 4.2, innerR = 2.1) {
  drawFn(BLACK, outerR);
  drawFn(colorRgba, innerR);
}

/* =========================================================================
   1. ANIMATED 3-FRAME MS PAINT LOGO: "Ameilia AI" + Heart & Pencil
   ========================================================================= */
function renderAmeliaLogoFrame(frameIdx) {
  const W = 340;
  const H = 68;
  const c = new PixelCanvas(W, H);

  const wob = (letterIndex) => {
    const table = [
      [0, 1, -1],
      [-1, 0, 1],
      [1, -1, 0],
      [0, -1, 1],
    ];
    return table[letterIndex % table.length][frameIdx % 3];
  };

  // 1. 'A' (Red #ff2b2b)
  {
    const dy = wob(0);
    drawDoubleStrokeGlyph(c, (col, r) => {
      c.line(14, 50 + dy, 25, 16 + dy, r, col);
      c.line(25, 16 + dy, 36, 50 + dy, r, col);
      c.line(18, 38 + dy, 32, 38 + dy, r, col);
    }, hex('#ff2b2b'));
  }

  // 2. 'm' (Orange #ff8800)
  {
    const dy = wob(1);
    drawDoubleStrokeGlyph(c, (col, r) => {
      c.line(46, 28 + dy, 46, 50 + dy, r, col);
      c.quadCurve(46, 31 + dy, 54, 24 + dy, 58, 32 + dy, r, col);
      c.line(58, 32 + dy, 58, 50 + dy, r, col);
      c.quadCurve(58, 31 + dy, 66, 24 + dy, 70, 32 + dy, r, col);
      c.line(70, 32 + dy, 70, 50 + dy, r, col);
    }, hex('#ff8800'));
  }

  // 3. 'e' (Yellow #fff200)
  {
    const dy = wob(2);
    drawDoubleStrokeGlyph(c, (col, r) => {
      c.line(82, 39 + dy, 99, 38 + dy, r, col);
      c.quadCurve(99, 38 + dy, 99, 26 + dy, 89, 27 + dy, r, col);
      c.quadCurve(89, 27 + dy, 80, 28 + dy, 81, 40 + dy, r, col);
      c.quadCurve(81, 40 + dy, 82, 51 + dy, 98, 48 + dy, r, col);
    }, hex('#fff200'));
  }

  // 4. 'i' (Lime #4ce619)
  {
    const dy = wob(3);
    drawDoubleStrokeGlyph(c, (col, r) => {
      c.line(111, 28 + dy, 111, 50 + dy, r, col);
      c.brush(111, 17 + dy, r + 0.5, col);
    }, hex('#4ce619'));
  }

  // 5. 'l' (Cyan #00eeff)
  {
    const dy = wob(4);
    drawDoubleStrokeGlyph(c, (col, r) => {
      c.line(125, 15 + dy, 125, 50 + dy, r, col);
    }, hex('#00eeff'));
  }

  // 6. 'i' (Blue #335cff)
  {
    const dy = wob(5);
    drawDoubleStrokeGlyph(c, (col, r) => {
      c.line(139, 28 + dy, 139, 50 + dy, r, col);
      c.brush(139, 17 + dy, r + 0.5, col);
    }, hex('#335cff'));
  }

  // 7. 'a' (Purple #a329ff)
  {
    const dy = wob(6);
    drawDoubleStrokeGlyph(c, (col, r) => {
      c.ovalOutline(157, 39 + dy, 9, 11, r, col, 1.8 + frameIdx * 0.6);
      c.line(166, 28 + dy, 167, 50 + dy, r, col);
    }, hex('#a329ff'));
  }

  // 8. Cute Floating Pixel Heart between "Ameilia" and "AI" (#ff6be8)
  {
    const hy = 34 + wob(7);
    const hx = 190;
    const hPts = [
      [hx, hy + 10],
      [hx - 10, hy],
      [hx - 10, hy - 6],
      [hx - 5, hy - 9],
      [hx, hy - 4],
      [hx + 5, hy - 9],
      [hx + 10, hy - 6],
      [hx + 10, hy],
    ];
    c.polyline(hPts, 1.6, BLACK, true);
    c.floodFill(hx, hy, hex('#ff477e'));
    c.polyline(hPts, 1.5, BLACK, true);
    c.setPixel(hx - 5, hy - 5, WHITE);
    c.setPixel(hx - 4, hy - 5, WHITE);
  }

  // 9. 'A' (Hot Pink #ff6be8)
  {
    const dy = wob(1);
    drawDoubleStrokeGlyph(c, (col, r) => {
      c.line(214, 50 + dy, 226, 16 + dy, r, col);
      c.line(226, 16 + dy, 238, 50 + dy, r, col);
      c.line(218, 38 + dy, 234, 38 + dy, r, col);
    }, hex('#ff6be8'));
  }

  // 10. 'I' (White #ffffff)
  {
    const dy = wob(2);
    drawDoubleStrokeGlyph(c, (col, r) => {
      c.line(250, 17 + dy, 266, 17 + dy, r, col);
      c.line(258, 17 + dy, 258, 50 + dy, r, col);
      c.line(250, 50 + dy, 266, 50 + dy, r, col);
    }, WHITE);
  }

  // 11. Hand-drawn tilted MS Paint Pencil & Sparkles on the right
  {
    const tiltShift = frameIdx === 1 ? 1 : frameIdx === 2 ? -1 : 0;
    const tipX = 290;
    const tipY = 52;
    const topX = 307 + tiltShift;
    const topY = 10;

    const pLeftTop = [topX - 7, topY + 2];
    const pRightTop = [topX + 7, topY + 7];
    const pLeftBody = [tipX - 5, tipY - 12];
    const pRightBody = [tipX + 9, tipY - 7];
    const pTip = [tipX - 2, tipY + 2];

    for (let t = 0.18; t <= 0.95; t += 0.06) {
      const lx = pLeftTop[0] + (pLeftBody[0] - pLeftTop[0]) * t;
      const ly = pLeftTop[1] + (pLeftBody[1] - pLeftTop[1]) * t;
      const rx = pRightTop[0] + (pRightBody[0] - pRightTop[0]) * t;
      const ry = pRightTop[1] + (pRightBody[1] - pRightTop[1]) * t;
      c.line(lx, ly, rx, ry, 1.5, hex('#ff8c1a'));
    }
    for (let t = 0; t < 0.22; t += 0.05) {
      const lx = pLeftTop[0] + (pLeftBody[0] - pLeftTop[0]) * t;
      const ly = pLeftTop[1] + (pLeftBody[1] - pLeftTop[1]) * t;
      const rx = pRightTop[0] + (pRightBody[0] - pRightTop[0]) * t;
      const ry = pRightTop[1] + (pRightBody[1] - pRightTop[1]) * t;
      c.line(lx, ly, rx, ry, 1.5, hex('#ff75d8'));
    }
    for (let t = 0; t <= 1; t += 0.08) {
      const bx = pLeftBody[0] + (pRightBody[0] - pLeftBody[0]) * t;
      const by = pLeftBody[1] + (pRightBody[1] - pLeftBody[1]) * t;
      c.line(bx, by, pTip[0], pTip[1], 1.1, hex('#ffd39b'));
    }

    const eL = [
      pLeftTop[0] + (pLeftBody[0] - pLeftTop[0]) * 0.22,
      pLeftTop[1] + (pLeftBody[1] - pLeftTop[1]) * 0.22,
    ];
    const eR = [
      pRightTop[0] + (pRightBody[0] - pRightTop[0]) * 0.22,
      pRightTop[1] + (pRightBody[1] - pRightTop[1]) * 0.22,
    ];
    const midTop = [(eL[0] + eR[0]) / 2, (eL[1] + eR[1]) / 2];
    const midBot = [(pLeftBody[0] + pRightBody[0]) / 2, (pLeftBody[1] + pRightBody[1]) / 2];

    c.line(midTop[0], midTop[1], midBot[0], midBot[1], 1.1, BLACK);
    c.line(eL[0], eL[1], eR[0], eR[1], 1.3, BLACK);
    c.line(pLeftBody[0], pLeftBody[1], pRightBody[0], pRightBody[1], 1.3, BLACK);
    c.polyline([pLeftTop, pRightTop, pRightBody, pTip, pLeftBody], 1.6, BLACK, true);
    c.brush(pTip[0], pTip[1] - 1, 2.2, BLACK);

    const sparkX = 324;
    const sparkY = 24;
    if (frameIdx === 0) {
      c.setPixel(sparkX, sparkY, hex('#fff200'));
      c.setPixel(sparkX + 1, sparkY, hex('#fff200'));
      c.setPixel(sparkX, sparkY + 1, hex('#fff200'));
    } else if (frameIdx === 1) {
      c.line(sparkX - 4, sparkY, sparkX + 4, sparkY, 0.8, hex('#fff200'));
      c.line(sparkX, sparkY - 4, sparkX, sparkY + 4, 0.8, hex('#fff200'));
      c.setPixel(sparkX, sparkY, WHITE);
    } else {
      c.line(sparkX - 2, sparkY - 2, sparkX + 2, sparkY + 2, 0.7, hex('#00eeff'));
      c.line(sparkX + 2, sparkY - 2, sparkX - 2, sparkY + 2, 0.7, hex('#00eeff'));
    }
  }

  return c;
}

function buildAmeliaLogoSheet() {
  const f0 = renderAmeliaLogoFrame(0);
  const f1 = renderAmeliaLogoFrame(1);
  const f2 = renderAmeliaLogoFrame(2);
  const sheet = new PixelCanvas(f0.width, f0.height * 3);
  sheet.blitFrom(f0, 0, 0);
  sheet.blitFrom(f1, 0, f0.height);
  sheet.blitFrom(f2, 0, f0.height * 2);
  return sheet;
}

/* =========================================================================
   2. SEAMLESS SKRIBBL-BLUE DOODLE WALLPAPER WITH RELATIONSHIP & GAME MOTIFS
   (Hearts, Stars, Gamepad, Cat/Snow Fox, Sushi, Gift Box, Planet, Speech Bubble, Crown)
   ========================================================================= */
function buildAmeliaDoodleWallpaper() {
  const S = 180;
  const c = new PixelCanvas(S, S);
  c.fillAll(hex('#3529a8'));
  const INK = hex('#261b87');

  // 1. Romantic Heart (top-left)
  c.polyline(
    [[24, 38], [13, 27], [14, 18], [20, 17], [24, 22], [28, 17], [34, 18], [35, 27]],
    1.1,
    INK,
    true
  );

  // 2. Game Controller (top-mid, for Overwatch / Fortnite / Virtual Dates!)
  c.polyline([[68, 16], [100, 16], [104, 32], [94, 36], [89, 28], [79, 28], [74, 36], [64, 32]], 1.0, INK, true);
  c.line(74, 21, 74, 25, 0.9, INK);
  c.line(72, 23, 76, 23, 0.9, INK);
  c.brush(93, 21, 1.1, INK);
  c.brush(96, 24, 1.1, INK);

  // 3. Cute Snow Fox / Cat Face with pointy ears (top-right)
  c.polyline([[134, 26], [136, 13], [144, 20], [152, 20], [160, 13], [162, 26], [156, 38], [140, 38]], 1.0, INK, true);
  c.brush(143, 28, 1.0, INK);
  c.brush(153, 28, 1.0, INK);
  c.polyline([[146, 32], [148, 34], [150, 32]], 0.8, INK, false);

  // 4. Speech Bubble with Heart (mid-left)
  c.polyline([[12, 68], [44, 68], [44, 90], [28, 90], [20, 98], [22, 90], [12, 90]], 1.0, INK, true);
  c.line(23, 78, 28, 83, 0.9, INK);
  c.line(33, 78, 28, 83, 0.9, INK);

  // 5. Pixel Crown (center)
  c.polyline(
    [[68, 96], [66, 80], [76, 88], [84, 77], [92, 88], [102, 80], [100, 96]],
    1.0,
    INK,
    true
  );

  // 6. Ringed Planet & Stars (mid-right)
  c.ovalOutline(148, 84, 9, 9, 1.0, INK, 1);
  c.line(132, 90, 164, 78, 1.0, INK);

  // 7. Gift Box with Ribbon (bottom-left)
  c.polyline([[14, 142], [40, 142], [40, 166], [14, 166]], 1.0, INK, true);
  c.line(27, 142, 27, 166, 1.0, INK);
  c.line(14, 153, 40, 153, 1.0, INK);
  c.ovalOutline(23, 138, 4, 3, 0.9, INK);
  c.ovalOutline(31, 138, 4, 3, 0.9, INK);

  // 8. Sushi Roll Doodle (bottom-center, her favorite food!)
  c.ovalOutline(84, 152, 13, 9, 1.1, INK);
  c.ovalOutline(84, 152, 5, 4, 0.9, INK);

  // 9. Cute Flower / Blossom (bottom-right)
  for (let a = 0; a < 5; a++) {
    const ang = (a / 5) * Math.PI * 2;
    c.ovalOutline(148 + Math.cos(ang) * 7, 150 + Math.sin(ang) * 7, 4, 4, 0.9, INK);
  }
  c.brush(148, 150, 2.0, INK);

  // 10. Twinkling Stars in gaps
  for (const [sx, sy] of [[54, 52], [116, 54], [55, 124], [118, 122]]) {
    c.line(sx, sy - 5, sx, sy + 5, 0.9, INK);
    c.line(sx - 5, sy, sx + 5, sy, 0.9, INK);
  }

  return c;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Copy existing Jeoparty sprite strips first
  const jeopartyAssetsDir = path.join(__dirname, '..', '..', '..', 'skribbl-jeopardy', 'public', 'assets');
  if (fs.existsSync(jeopartyAssetsDir)) {
    const files = fs.readdirSync(jeopartyAssetsDir);
    for (const f of files) {
      const srcFile = path.join(jeopartyAssetsDir, f);
      if (fs.statSync(srcFile).isFile() && f.endsWith('.png')) {
        fs.copyFileSync(srcFile, path.join(OUT_DIR, f));
      }
    }
  }

  // Generate custom Ameilia AI logo sheet and doodle background
  const logoSheet = buildAmeliaLogoSheet();
  fs.writeFileSync(path.join(OUT_DIR, 'amelia-logo-sheet.png'), logoSheet.toPNG());
  fs.writeFileSync(path.join(OUT_DIR, 'logo-sheet.png'), logoSheet.toPNG());

  const doodleBg = buildAmeliaDoodleWallpaper();
  fs.writeFileSync(path.join(OUT_DIR, 'doodle-bg.png'), doodleBg.toPNG());

  console.log('Successfully generated Ameilia AI MS Paint pixel assets in public/assets/');
}

main();
