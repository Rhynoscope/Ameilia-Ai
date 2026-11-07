// Authentic MS Paint Pixel-Art Animated Avatar System (Reused from Jeoparty.io)
// Renders crisp un-antialiased 4-frame 52x52 pixel-art sprite strips into cached PNG data URLs.

export interface PixelAvatarConfig {
  color: number;
  eyes: number;
  mouth: number;
  hat: number;
  name?: string;
}

export const AVATAR_COLORS = [
  { name: "Red", fill: "#ff2b2b", shade: "#c91818", stripe: null },
  { name: "Orange", fill: "#ff8800", shade: "#cc6600", stripe: null },
  { name: "Yellow", fill: "#fff200", shade: "#ccb800", stripe: null },
  { name: "Lime", fill: "#4ce619", shade: "#2fb30b", stripe: null },
  { name: "Cyan", fill: "#00eeff", shade: "#00b5cc", stripe: null },
  { name: "Blue", fill: "#335cff", shade: "#1d3bb8", stripe: null },
  { name: "Purple", fill: "#9d1aff", shade: "#6f0db8", stripe: null },
  { name: "Pink", fill: "#ff6be8", shade: "#cc47b6", stripe: null },
  { name: "Mint", fill: "#19e699", shade: "#0fb375", stripe: null },
  { name: "Salmon", fill: "#ff7b7b", shade: "#cc5656", stripe: null },
  { name: "Grey", fill: "#8a8f9e", shade: "#636875", stripe: null },
  { name: "Charcoal", fill: "#454954", shade: "#2b2e36", stripe: null },
  { name: "Brown", fill: "#8f5738", shade: "#693d24", stripe: null },
  { name: "Peach", fill: "#f2c89b", shade: "#c79e73", stripe: null },
  { name: "White", fill: "#ffffff", shade: "#cfd5e6", stripe: null },
  { name: "Candy Red Stripe", fill: "#e61919", shade: "#9e0b0b", stripe: "#ff5959" },
  { name: "Gold Stripe", fill: "#ffd000", shade: "#bd9200", stripe: "#fff566" },
  { name: "Lime Stripe", fill: "#42cc14", shade: "#298f08", stripe: "#7aff4d" },
  { name: "Cyber Cyan Stripe", fill: "#00c8ff", shade: "#008eb8", stripe: "#75ebff" },
  { name: "Grape Stripe", fill: "#a633ff", shade: "#7319bd", stripe: "#ce85ff" },
] as const;

export const EYE_COUNT = 16;
export const MOUTH_COUNT = 16;
export const HAT_COUNT = 11;

export const EYE_LABELS = [
  "Classic Dot Eyes",
  "Sideways Glance",
  "Goofy Derp Eyes",
  "Fierce V-Brows",
  "Sleepy Zzz Eyes",
  "Happy ^ ^ Squints",
  "Shocked O-Eyes",
  "Cool Pixel Shades",
  "Dizzy X X Eyes",
  "Money $ $ Eyes",
  "Puppy Pleading",
  "Posh Monocle",
  "Pirate Eyepatch",
  "Heart-Struck ❤️",
  "Cheeky Wink ;)",
  "Suspicious Squint",
];

export const MOUTH_LABELS = [
  "Skribbl Buck Grin",
  "Cheerful Open Smile",
  "Wobbly ~ Squiggle",
  "Grumpy Frown",
  "Cute Cat :3 Mouth",
  "Surprised o-Mouth",
  "Silly Tongue :P",
  "Shark Gremlin Grin",
  "Deadpan Line",
  "Host Mustache",
  "Twin Nerd Teeth",
  "Cheeky Side Smirk",
  "Shocked Scream",
  "Whiskered Cat Grin",
  "Halloween Stitches",
  "Happy U-Smile",
];

export const HAT_LABELS = [
  "No Hat",
  "Party Cone Hat",
  "Pizza Slice Hat",
  "Little Devil Horns",
  "Golden Angel Halo",
  "Cute Cat Ears",
  "Purple Wizard Hat",
  "Spiky Cyan Hair",
  "Pirate Tricorn",
  "Leafy Green Sprout",
  "Rainbow Headband",
];

export const DEFAULT_MY_AVATAR: PixelAvatarConfig = {
  color: 5, // Blue
  eyes: 14, // Cheeky Wink
  mouth: 0, // Skribbl Grin
  hat: 1, // Party Cone Hat
  name: "Ryan",
};

export const DEFAULT_HER_AVATAR: PixelAvatarConfig = {
  color: 7, // Pink
  eyes: 13, // Heart-Struck
  mouth: 4, // Cute Cat :3
  hat: 5, // Cat Ears
  name: "Amelia",
};

const FRAME_W = 52;
const FRAME_H = 52;
const FRAME_COUNT = 4;

const spriteUrlCache = new Map<string, string>();

type RGBA = [number, number, number, number];

function hexToRgba(h: string): RGBA {
  const s = h.replace("#", "");
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
    255,
  ];
}

const BLACK: RGBA = [0, 0, 0, 255];
const WHITE: RGBA = [255, 255, 255, 255];
const RED: RGBA = [255, 42, 42, 255];
const PINK: RGBA = [255, 105, 180, 255];
const GOLD: RGBA = [255, 217, 0, 255];
const CYAN: RGBA = [0, 238, 255, 255];
const LIME: RGBA = [71, 230, 46, 255];

class MiniPixelGrid {
  w: number;
  h: number;
  buf: Uint8ClampedArray;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8ClampedArray(w * h * 4);
  }

  px(x: number, y: number, rgba: RGBA) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    const o = (iy * this.w + ix) * 4;
    this.buf[o] = rgba[0];
    this.buf[o + 1] = rgba[1];
    this.buf[o + 2] = rgba[2];
    this.buf[o + 3] = rgba[3];
  }

  get(x: number, y: number): RGBA {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return [0, 0, 0, 0];
    const o = (iy * this.w + ix) * 4;
    return [this.buf[o], this.buf[o + 1], this.buf[o + 2], this.buf[o + 3]];
  }

  brush(cx: number, cy: number, r: number, rgba: RGBA) {
    const ix = Math.round(cx);
    const iy = Math.round(cy);
    const rc = Math.ceil(r);
    const rSq = r * r + 0.22;
    for (let dy = -rc; dy <= rc; dy++) {
      for (let dx = -rc; dx <= rc; dx++) {
        if (dx * dx + dy * dy <= rSq) {
          this.px(ix + dx, iy + dy, rgba);
        }
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, r: number, rgba: RGBA) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.brush(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, rgba);
    }
  }

  poly(pts: number[][], r: number, rgba: RGBA, closed = false) {
    for (let i = 0; i < pts.length - 1; i++) {
      this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r, rgba);
    }
    if (closed && pts.length > 2) {
      const last = pts[pts.length - 1];
      this.line(last[0], last[1], pts[0][0], pts[0][1], r, rgba);
    }
  }

  oval(cx: number, cy: number, rx: number, ry: number, r: number, rgba: RGBA, wobble = 0) {
    const steps = 40;
    let prev: number[] | null = null;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const w = wobble ? Math.sin(a * 3 + wobble) * 0.45 : 0;
      const x = cx + Math.cos(a) * (rx + w);
      const y = cy + Math.sin(a) * (ry - w * 0.4);
      if (prev) this.line(prev[0], prev[1], x, y, r, rgba);
      prev = [x, y];
    }
  }

  rect(x: number, y: number, w: number, h: number, rgba: RGBA) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        this.px(px, py, rgba);
      }
    }
  }

  floodFill(
    sx: number,
    sy: number,
    fillRgba: RGBA,
    stripeRgba: RGBA | null = null,
    shadeRgba: RGBA | null = null,
    shadeY = 999
  ) {
    const startX = Math.round(sx);
    const startY = Math.round(sy);
    if (startX < 0 || startY < 0 || startX >= this.w || startY >= this.h) return;
    const target = this.get(startX, startY);
    if (target[3] === 255 && target[0] === 0 && target[1] === 0 && target[2] === 0) {
      return;
    }
    if (
      target[0] === fillRgba[0] &&
      target[1] === fillRgba[1] &&
      target[2] === fillRgba[2] &&
      target[3] === fillRgba[3]
    ) {
      return;
    }

    const visited = new Uint8Array(this.w * this.h);
    const stack: [number, number][] = [[startX, startY]];
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
      const idx = y * this.w + x;
      if (visited[idx]) continue;
      const o = idx * 4;
      if (
        this.buf[o] !== target[0] ||
        this.buf[o + 1] !== target[1] ||
        this.buf[o + 2] !== target[2] ||
        this.buf[o + 3] !== target[3]
      ) {
        continue;
      }
      visited[idx] = 1;

      let chosen = fillRgba;
      if (shadeRgba && y >= shadeY) {
        chosen = shadeRgba;
      } else if (stripeRgba && (x + y) % 7 < 3) {
        chosen = stripeRgba;
      }
      this.px(x, y, chosen);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
}

function drawBodyAndHead(
  g: MiniPixelGrid,
  palette: (typeof AVATAR_COLORS)[number],
  shapeVariant: number,
  bobY: number,
  boilSeed: number
) {
  const fill = hexToRgba(palette.fill);
  const shade = hexToRgba(palette.shade);
  const stripe = palette.stripe ? hexToRgba(palette.stripe) : null;

  const shPts = [
    [8, 50],
    [10, 43 + bobY],
    [16, 39 + bobY],
    [26, 38 + bobY],
    [36, 39 + bobY],
    [42, 43 + bobY],
    [44, 50],
  ];
  g.poly(shPts, 1.4, BLACK, true);
  g.floodFill(26, 46, fill, stripe, shade, 48);
  g.poly(shPts, 1.4, BLACK, true);

  const v = shapeVariant % 5;
  if (v === 1) {
    const headPts = [
      [14, 15 + bobY],
      [38, 14 + bobY],
      [40, 26 + bobY],
      [38, 37 + bobY],
      [14, 37 + bobY],
      [12, 26 + bobY],
    ];
    g.poly(headPts, 1.5, BLACK, true);
    g.floodFill(26, 26 + bobY, fill, stripe, shade, 35 + bobY);
    g.poly(headPts, 1.5, BLACK, true);
  } else if (v === 2) {
    g.oval(26, 26 + bobY, 15, 12.5, 1.5, BLACK, 1.1 + boilSeed);
    g.floodFill(26, 26 + bobY, fill, stripe, shade, 35 + bobY);
    g.oval(26, 26 + bobY, 15, 12.5, 1.5, BLACK, 1.1 + boilSeed);
  } else if (v === 3) {
    g.oval(26, 25 + bobY, 12.5, 14, 1.5, BLACK, 2.2 + boilSeed);
    g.floodFill(26, 25 + bobY, fill, stripe, shade, 36 + bobY);
    g.oval(26, 25 + bobY, 12.5, 14, 1.5, BLACK, 2.2 + boilSeed);
  } else if (v === 4) {
    g.oval(26, 26 + bobY, 13.8, 13, 1.5, BLACK, 3.4 + boilSeed);
    g.floodFill(26, 26 + bobY, fill, stripe, shade, 36 + bobY);
    g.oval(26, 26 + bobY, 13.8, 13, 1.5, BLACK, 3.4 + boilSeed);
  } else {
    g.oval(26, 26 + bobY, 13.5, 13, 1.5, BLACK, 0.5 + boilSeed);
    g.floodFill(26, 26 + bobY, fill, stripe, shade, 36 + bobY);
    g.oval(26, 26 + bobY, 13.5, 13, 1.5, BLACK, 0.5 + boilSeed);
  }
}

function drawEyes(
  g: MiniPixelGrid,
  eyesIdx: number,
  bobY: number,
  isBlinkFrame: boolean,
  frameIdx: number
) {
  const idx = ((eyesIdx % EYE_COUNT) + EYE_COUNT) % EYE_COUNT;
  const ey = 23 + bobY;

  if (isBlinkFrame && idx !== 7 && idx !== 9) {
    g.line(17, ey, 23, ey, 1.1, BLACK);
    g.line(29, ey, 35, ey, 1.1, BLACK);
    return;
  }

  switch (idx) {
    case 0:
      g.brush(20, ey, 2.1, BLACK);
      g.brush(32, ey, 2.1, BLACK);
      break;
    case 1: {
      const lookX = frameIdx === 2 ? 0 : 1;
      g.oval(20, ey, 3.8, 3.8, 1.1, BLACK);
      g.floodFill(20, ey, WHITE);
      g.oval(32, ey, 3.8, 3.8, 1.1, BLACK);
      g.floodFill(32, ey, WHITE);
      g.brush(20 + lookX, ey, 1.4, BLACK);
      g.brush(32 + lookX, ey, 1.4, BLACK);
      break;
    }
    case 2:
      g.oval(19, ey, 4.3, 4.3, 1.1, BLACK);
      g.floodFill(19, ey, WHITE);
      g.oval(32, ey, 3.0, 3.0, 1.1, BLACK);
      g.floodFill(32, ey, WHITE);
      g.brush(18, ey - 1, 1.3, BLACK);
      g.brush(33, ey + 1, 1.2, BLACK);
      break;
    case 3:
      g.oval(20, ey + 1, 3.4, 3.2, 1.1, BLACK);
      g.floodFill(20, ey + 1, WHITE);
      g.oval(32, ey + 1, 3.4, 3.2, 1.1, BLACK);
      g.floodFill(32, ey + 1, WHITE);
      g.brush(21, ey + 1, 1.3, BLACK);
      g.brush(31, ey + 1, 1.3, BLACK);
      g.line(15, ey - 4, 24, ey - 1, 1.4, BLACK);
      g.line(37, ey - 4, 28, ey - 1, 1.4, BLACK);
      break;
    case 4:
      g.line(16, ey, 24, ey, 1.3, BLACK);
      g.line(28, ey, 36, ey, 1.3, BLACK);
      g.brush(20, ey + 2, 1.3, BLACK);
      g.brush(32, ey + 2, 1.3, BLACK);
      if (frameIdx === 1 || frameIdx === 2) {
        const zy = frameIdx === 2 ? ey - 9 : ey - 7;
        g.line(38, zy, 41, zy, 0.6, BLACK);
        g.line(41, zy, 38, zy + 3, 0.6, BLACK);
        g.line(38, zy + 3, 41, zy + 3, 0.6, BLACK);
      }
      break;
    case 5:
      g.line(17, ey + 1, 20, ey - 2, 1.3, BLACK);
      g.line(20, ey - 2, 23, ey + 1, 1.3, BLACK);
      g.line(29, ey + 1, 32, ey - 2, 1.3, BLACK);
      g.line(32, ey - 2, 35, ey + 1, 1.3, BLACK);
      break;
    case 6:
      g.oval(20, ey, 4.4, 4.4, 1.1, BLACK);
      g.floodFill(20, ey, WHITE);
      g.oval(32, ey, 4.4, 4.4, 1.1, BLACK);
      g.floodFill(32, ey, WHITE);
      g.px(20, ey, BLACK);
      g.px(32, ey, BLACK);
      break;
    case 7: {
      g.line(13, ey - 2, 39, ey - 2, 1.3, BLACK);
      g.rect(15, ey - 2, 9, 6, BLACK);
      g.rect(28, ey - 2, 9, 6, BLACK);
      const gx = isBlinkFrame ? 2 : 0;
      g.line(17 + gx, ey, 19 + gx, ey, 0.8, WHITE);
      g.line(30 + gx, ey, 32 + gx, ey, 0.8, WHITE);
      break;
    }
    case 8:
      g.line(17, ey - 3, 23, ey + 3, 1.2, BLACK);
      g.line(23, ey - 3, 17, ey + 3, 1.2, BLACK);
      g.line(29, ey - 3, 35, ey + 3, 1.2, BLACK);
      g.line(35, ey - 3, 29, ey + 3, 1.2, BLACK);
      break;
    case 9: {
      const col = isBlinkFrame ? GOLD : LIME;
      for (const cx of [20, 32]) {
        g.oval(cx, ey, 4.2, 4.2, 1.1, BLACK);
        g.floodFill(cx, ey, WHITE);
        g.line(cx, ey - 3, cx, ey + 3, 0.7, BLACK);
        g.px(cx - 1, ey - 1, col);
        g.px(cx, ey, col);
        g.px(cx + 1, ey + 1, col);
      }
      break;
    }
    case 10:
      g.brush(20, ey + 1, 2.5, BLACK);
      g.brush(32, ey + 1, 2.5, BLACK);
      g.px(19, ey, WHITE);
      g.px(31, ey, WHITE);
      g.line(16, ey - 2, 22, ey - 4, 1.1, BLACK);
      g.line(36, ey - 2, 30, ey - 4, 1.1, BLACK);
      break;
    case 11:
      g.brush(20, ey, 1.9, BLACK);
      g.oval(32, ey, 4.6, 4.6, 1.2, BLACK);
      g.floodFill(32, ey, CYAN);
      g.oval(32, ey, 4.6, 4.6, 1.1, BLACK);
      g.brush(32, ey, 1.4, BLACK);
      g.line(37, ey + 2, 37, ey + 11, 0.8, BLACK);
      break;
    case 12:
      g.line(14, ey - 4, 38, ey - 1, 1.1, BLACK);
      g.brush(20, ey, 2.0, BLACK);
      g.brush(32, ey, 3.6, BLACK);
      break;
    case 13:
      for (const cx of [20, 32]) {
        g.brush(cx - 1.5, ey - 1, 1.8, BLACK);
        g.brush(cx + 1.5, ey - 1, 1.8, BLACK);
        g.brush(cx, ey + 1, 2.0, BLACK);
        g.brush(cx - 1, ey - 1, 1.0, RED);
        g.brush(cx + 1, ey - 1, 1.0, RED);
        g.px(cx, ey + 1, RED);
      }
      break;
    case 14:
      g.brush(20, ey, 2.1, BLACK);
      g.line(29, ey - 2, 34, ey, 1.2, BLACK);
      g.line(34, ey, 29, ey + 2, 1.2, BLACK);
      break;
    case 15:
    default:
      g.rect(16, ey - 1, 7, 3, BLACK);
      g.rect(29, ey - 1, 7, 3, BLACK);
      break;
  }
}

function drawMouth(g: MiniPixelGrid, mouthIdx: number, bobY: number, frameIdx: number) {
  const idx = ((mouthIdx % MOUTH_COUNT) + MOUTH_COUNT) % MOUTH_COUNT;
  const my = 31 + bobY;
  const chatter = frameIdx === 1 ? 1 : 0;

  switch (idx) {
    case 0:
      g.rect(19, my - 2, 14, 6 + chatter, BLACK);
      g.rect(21, my, 10, 2 + chatter, WHITE);
      g.line(26, my - 1, 26, my + 2 + chatter, 0.8, BLACK);
      break;
    case 1:
      g.poly(
        [
          [18, my - 1],
          [34, my - 1],
          [32, my + 5 + chatter],
          [20, my + 5 + chatter],
        ],
        1.2,
        BLACK,
        true
      );
      g.floodFill(26, my + 2, BLACK);
      g.rect(23, my + 2 + chatter, 6, 2, RED);
      break;
    case 2:
      g.poly(
        [
          [18, my + 1],
          [22, my - 1 + chatter],
          [26, my + 2],
          [30, my - 1],
          [34, my + 1 - chatter],
        ],
        1.2,
        BLACK
      );
      break;
    case 3:
      g.poly(
        [
          [19, my + 3],
          [23, my],
          [29, my],
          [33, my + 3],
        ],
        1.3,
        BLACK
      );
      break;
    case 4:
      g.poly(
        [
          [19, my],
          [23, my + 3],
          [26, my],
          [29, my + 3],
          [33, my],
        ],
        1.2,
        BLACK
      );
      break;
    case 5:
      g.brush(26, my + 1, 2.8 + chatter * 0.6, BLACK);
      g.brush(26, my + 1, 1.1 + chatter * 0.4, RED);
      break;
    case 6:
      g.line(19, my, 33, my, 1.3, BLACK);
      g.rect(25, my + 1, 6, 5 + chatter, BLACK);
      g.rect(26, my + 1, 4, 3 + chatter, PINK);
      break;
    case 7:
      g.rect(18, my - 2, 16, 6, BLACK);
      g.poly(
        [
          [19, my + 1],
          [22, my - 1],
          [25, my + 2],
          [28, my - 1],
          [31, my + 2],
          [33, my],
        ],
        0.9,
        WHITE
      );
      break;
    case 8:
      g.line(20, my + 1, 32, my + 1, 1.3, BLACK);
      break;
    case 9:
      g.poly(
        [
          [16, my + 2 - chatter],
          [21, my - 1],
          [26, my + 1],
          [31, my - 1],
          [36, my + 2 - chatter],
        ],
        1.9,
        BLACK
      );
      break;
    case 10:
      g.line(19, my, 33, my, 1.3, BLACK);
      g.rect(22, my + 1, 8, 5, BLACK);
      g.rect(23, my + 1, 2, 3, WHITE);
      g.rect(27, my + 1, 2, 3, WHITE);
      break;
    case 11:
      g.poly(
        [
          [20, my + 2],
          [28, my + 2],
          [33, my - 2 - chatter],
        ],
        1.3,
        BLACK
      );
      break;
    case 12:
      g.rect(20, my - 2, 12, 7 + chatter, BLACK);
      g.rect(22, my - 1, 8, 2, WHITE);
      break;
    case 13:
      g.poly(
        [
          [23, my + 2],
          [26, my - 1],
          [29, my + 2],
        ],
        1.2,
        BLACK
      );
      g.line(13, my - 1, 19, my, 0.9, BLACK);
      g.line(13, my + 3, 19, my + 2, 0.9, BLACK);
      g.line(39, my - 1, 33, my, 0.9, BLACK);
      g.line(39, my + 3, 33, my + 2, 0.9, BLACK);
      break;
    case 14:
      g.line(19, my + 1, 33, my + 1, 1.1, BLACK);
      for (const sx of [21, 25, 29, 31]) {
        g.line(sx, my - 1, sx, my + 3, 0.8, BLACK);
      }
      break;
    case 15:
    default:
      g.poly(
        [
          [19, my - 1],
          [23, my + 3 + chatter],
          [29, my + 3 + chatter],
          [33, my - 1],
        ],
        1.3,
        BLACK
      );
      break;
  }
}

function drawHatOrCrown(
  g: MiniPixelGrid,
  hatIdx: number,
  showCrown: boolean,
  bobY: number,
  frameIdx: number
) {
  if (showCrown) {
    const cy = 4 + bobY;
    const pts = [
      [18, cy + 10],
      [16, cy + 2],
      [22, cy + 7],
      [27, cy],
      [32, cy + 7],
      [38, cy + 2],
      [35, cy + 11],
    ];
    g.poly(pts, 1.3, BLACK, true);
    g.floodFill(27, cy + 7, GOLD);
    g.poly(pts, 1.2, BLACK, true);
    g.brush(27, cy + 7, 1.2, frameIdx % 2 === 0 ? RED : CYAN);
    return;
  }

  const idx = ((hatIdx % HAT_COUNT) + HAT_COUNT) % HAT_COUNT;
  if (idx === 0) return;

  const hy = 5 + bobY;
  switch (idx) {
    case 1:
      g.poly(
        [
          [20, hy + 10],
          [26, hy],
          [32, hy + 10],
        ],
        1.3,
        BLACK,
        true
      );
      g.floodFill(26, hy + 7, CYAN);
      g.poly(
        [
          [20, hy + 10],
          [26, hy],
          [32, hy + 10],
        ],
        1.2,
        BLACK,
        true
      );
      g.brush(26, hy, 1.8, GOLD);
      break;
    case 2:
      g.poly(
        [
          [19, hy + 3],
          [33, hy + 5],
          [25, hy + 13],
        ],
        1.3,
        BLACK,
        true
      );
      g.floodFill(26, hy + 7, GOLD);
      g.poly(
        [
          [19, hy + 3],
          [33, hy + 5],
          [25, hy + 13],
        ],
        1.2,
        BLACK,
        true
      );
      g.px(25, hy + 7, RED);
      g.px(28, hy + 8, RED);
      break;
    case 3:
      g.poly(
        [
          [13, hy + 11],
          [11, hy + 2],
          [20, hy + 8],
        ],
        1.2,
        BLACK,
        true
      );
      g.floodFill(15, hy + 7, RED);
      g.poly(
        [
          [13, hy + 11],
          [11, hy + 2],
          [20, hy + 8],
        ],
        1.2,
        BLACK,
        true
      );
      g.poly(
        [
          [39, hy + 11],
          [41, hy + 2],
          [32, hy + 8],
        ],
        1.2,
        BLACK,
        true
      );
      g.floodFill(37, hy + 7, RED);
      g.poly(
        [
          [39, hy + 11],
          [41, hy + 2],
          [32, hy + 8],
        ],
        1.2,
        BLACK,
        true
      );
      break;
    case 4: {
      const floatY = frameIdx === 1 ? -1 : 0;
      g.oval(26, hy + 2 + floatY, 8, 2.6, 1.7, BLACK);
      g.oval(26, hy + 2 + floatY, 8, 2.6, 0.9, GOLD);
      break;
    }
    case 5:
      g.poly(
        [
          [14, hy + 11],
          [15, hy + 2],
          [22, hy + 8],
        ],
        1.3,
        BLACK,
        true
      );
      g.floodFill(17, hy + 7, PINK);
      g.poly(
        [
          [14, hy + 11],
          [15, hy + 2],
          [22, hy + 8],
        ],
        1.2,
        BLACK,
        true
      );
      g.poly(
        [
          [38, hy + 11],
          [37, hy + 2],
          [30, hy + 8],
        ],
        1.3,
        BLACK,
        true
      );
      g.floodFill(35, hy + 7, PINK);
      g.poly(
        [
          [38, hy + 11],
          [37, hy + 2],
          [30, hy + 8],
        ],
        1.2,
        BLACK,
        true
      );
      break;
    case 6:
      g.poly(
        [
          [19, hy + 9],
          [27, hy - 1],
          [33, hy + 9],
        ],
        1.3,
        BLACK,
        true
      );
      g.floodFill(26, hy + 6, hexToRgba("#7d2ae8"));
      g.poly(
        [
          [19, hy + 9],
          [27, hy - 1],
          [33, hy + 9],
        ],
        1.3,
        BLACK,
        true
      );
      g.line(13, hy + 10, 39, hy + 10, 1.8, BLACK);
      break;
    case 7:
      g.poly(
        [
          [14, hy + 10],
          [11, hy + 2],
          [19, hy + 6],
          [26, hy - 1],
          [33, hy + 6],
          [41, hy + 2],
          [38, hy + 10],
        ],
        1.3,
        BLACK,
        true
      );
      g.floodFill(26, hy + 6, CYAN);
      g.poly(
        [
          [14, hy + 10],
          [11, hy + 2],
          [19, hy + 6],
          [26, hy - 1],
          [33, hy + 6],
          [41, hy + 2],
          [38, hy + 10],
        ],
        1.2,
        BLACK,
        true
      );
      break;
    case 8:
      g.poly(
        [
          [12, hy + 10],
          [18, hy + 2],
          [34, hy + 2],
          [40, hy + 10],
        ],
        1.3,
        BLACK,
        true
      );
      g.floodFill(26, hy + 6, hexToRgba("#2b2d42"));
      g.poly(
        [
          [12, hy + 10],
          [18, hy + 2],
          [34, hy + 2],
          [40, hy + 10],
        ],
        1.3,
        BLACK,
        true
      );
      g.brush(26, hy + 6, 1.3, WHITE);
      break;
    case 9:
      g.line(26, hy + 9, 26, hy + 3, 1.2, BLACK);
      g.oval(22, hy + 3, 3.5, 2, 1.1, BLACK);
      g.floodFill(22, hy + 3, LIME);
      g.oval(30, hy + 3, 3.5, 2, 1.1, BLACK);
      g.floodFill(30, hy + 3, LIME);
      break;
    case 10:
    default:
      g.oval(26, hy + 9, 10, 5, 2.2, BLACK);
      g.oval(26, hy + 9, 10, 5, 1.1, RED);
      g.oval(26, hy + 10, 9, 4, 0.9, GOLD);
      break;
  }
}

export type AvatarConfig = PixelAvatarConfig;

export const COLOR_LABELS = AVATAR_COLORS.map((c) => c.name);

export function getSpriteStripUrl(
  avatar: Partial<PixelAvatarConfig> = {},
  optsOrCrown: boolean | { showCrown?: boolean } = false
): string {
  if (typeof document === "undefined") return "";
  const showCrown =
    typeof optsOrCrown === "boolean"
      ? optsOrCrown
      : Boolean(optsOrCrown?.showCrown);

  const cIdx =
    (((Number(avatar.color) || 0) % AVATAR_COLORS.length) + AVATAR_COLORS.length) %
    AVATAR_COLORS.length;
  const eIdx = (((Number(avatar.eyes) || 0) % EYE_COUNT) + EYE_COUNT) % EYE_COUNT;
  const mIdx = (((Number(avatar.mouth) || 0) % MOUTH_COUNT) + MOUTH_COUNT) % MOUTH_COUNT;
  const hIdx = (((Number(avatar.hat) || 0) % HAT_COUNT) + HAT_COUNT) % HAT_COUNT;
  const key = `${cIdx}:${eIdx}:${mIdx}:${hIdx}:${showCrown ? 1 : 0}`;

  if (spriteUrlCache.has(key)) {
    return spriteUrlCache.get(key)!;
  }

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_W * FRAME_COUNT;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingEnabled = false;

  const palette = AVATAR_COLORS[cIdx];
  const shapeVariant = (cIdx + eIdx * 2 + hIdx) % 5;

  for (let f = 0; f < FRAME_COUNT; f++) {
    const grid = new MiniPixelGrid(FRAME_W, FRAME_H);
    const bobY = f === 1 ? -1 : 0;
    const boilSeed = f * 0.85;
    const isBlink = f === 3;

    drawBodyAndHead(grid, palette, shapeVariant, bobY, boilSeed);
    drawEyes(grid, eIdx, bobY, isBlink, f);
    drawMouth(grid, mIdx, bobY, f);
    drawHatOrCrown(grid, hIdx, showCrown, bobY, f);

    const imgData = new ImageData(new Uint8ClampedArray(grid.buf), FRAME_W, FRAME_H);
    ctx.putImageData(imgData, f * FRAME_W, 0);
  }

  const url = canvas.toDataURL("image/png");
  if (spriteUrlCache.size > 400) {
    const firstKey = spriteUrlCache.keys().next().value;
    if (firstKey) spriteUrlCache.delete(firstKey);
  }
  spriteUrlCache.set(key, url);
  return url;
}

export function randomAvatar(name?: string): PixelAvatarConfig {
  return {
    color: Math.floor(Math.random() * AVATAR_COLORS.length),
    eyes: Math.floor(Math.random() * EYE_COUNT),
    mouth: Math.floor(Math.random() * MOUTH_COUNT),
    hat: Math.random() < 0.25 ? 0 : Math.floor(Math.random() * HAT_COUNT),
    name: name || "Player",
  };
}

const MY_AVATAR_STORAGE_KEY = "amelia_my_pixel_avatar";
const HER_AVATAR_STORAGE_KEY = "amelia_her_pixel_avatar";

export function loadSavedAvatars(): {
  myAvatar: PixelAvatarConfig;
  herAvatar: PixelAvatarConfig;
} {
  if (typeof window === "undefined") {
    return { myAvatar: DEFAULT_MY_AVATAR, herAvatar: DEFAULT_HER_AVATAR };
  }
  try {
    const myRaw = localStorage.getItem(MY_AVATAR_STORAGE_KEY);
    const herRaw = localStorage.getItem(HER_AVATAR_STORAGE_KEY);
    const myAvatar = myRaw ? { ...DEFAULT_MY_AVATAR, ...JSON.parse(myRaw) } : DEFAULT_MY_AVATAR;
    const herAvatar = herRaw ? { ...DEFAULT_HER_AVATAR, ...JSON.parse(herRaw) } : DEFAULT_HER_AVATAR;
    return { myAvatar, herAvatar };
  } catch {
    return { myAvatar: DEFAULT_MY_AVATAR, herAvatar: DEFAULT_HER_AVATAR };
  }
}

export function loadMyAvatar(): PixelAvatarConfig {
  return loadSavedAvatars().myAvatar;
}

export function loadHerAvatar(): PixelAvatarConfig {
  return loadSavedAvatars().herAvatar;
}

export function saveMyAvatar(cfg: PixelAvatarConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MY_AVATAR_STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent("amelia-avatar-changed"));
    window.dispatchEvent(new CustomEvent("amelia:avatars-updated"));
  } catch {}
}

export function saveHerAvatar(cfg: PixelAvatarConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HER_AVATAR_STORAGE_KEY, JSON.stringify(cfg));
    window.dispatchEvent(new CustomEvent("amelia-avatar-changed"));
    window.dispatchEvent(new CustomEvent("amelia:avatars-updated"));
  } catch {}
}

export function saveAvatarsToLocal(
  myAvatar: PixelAvatarConfig,
  herAvatar?: PixelAvatarConfig
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MY_AVATAR_STORAGE_KEY, JSON.stringify(myAvatar));
    if (herAvatar) {
      localStorage.setItem(HER_AVATAR_STORAGE_KEY, JSON.stringify(herAvatar));
    }
    window.dispatchEvent(new CustomEvent("amelia-avatar-changed"));
    window.dispatchEvent(new CustomEvent("amelia:avatars-updated"));
  } catch {}
}
