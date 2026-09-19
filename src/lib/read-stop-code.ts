/** Read a 5-digit stop code from a photo. Colour-agnostic: light or dark digits. */

export type PixelSource = {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
  /** 4 for ImageData, 3 for RGB buffers. Default 4. */
  channels?: 3 | 4;
};

type Blob = { x0: number; x1: number; y0: number; y1: number; w: number; h: number };

type Hit = { code: string; conf: number; height: number; inCatalog: boolean };

function pixel(src: PixelSource, x: number, y: number) {
  const ch = src.channels ?? 4;
  const i = (y * src.width + x) * ch;
  return [src.data[i], src.data[i + 1], src.data[i + 2]] as const;
}

function luminanceOf(src: PixelSource) {
  const w = src.width;
  const h = src.height;
  const lum = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(src, x, y);
      lum[y * w + x] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }
  return lum;
}

function blobsFromInk(ink: Uint8Array, w: number, h: number): Blob[] {
  const col = new Float64Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (ink[y * w + x]) col[x] += 1;
    }
  }
  for (let x = 0; x < w; x++) col[x] /= h;

  const blobs: Blob[] = [];
  let i = 0;
  while (i < w) {
    if (col[i] <= 0.1) {
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < w && col[j] > 0.1) j += 1;
    if (j - i >= 3) {
      let y0 = h;
      let y1 = 0;
      let x0 = j;
      let x1 = i;
      for (let y = 0; y < h; y++) {
        for (let x = i; x < j; x++) {
          if (!ink[y * w + x]) continue;
          if (x < x0) x0 = x;
          if (x + 1 > x1) x1 = x + 1;
          if (y < y0) y0 = y;
          if (y + 1 > y1) y1 = y + 1;
        }
      }
      if (x1 > x0 && y1 > y0) {
        blobs.push({ x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 });
      }
    }
    i = j;
  }
  return blobs;
}

function pickFive(blobs: Blob[], headerH: number, headerW: number): Blob[] | null {
  if (blobs.length < 5) return null;
  let cands = blobs.filter((b) => b.h >= headerH * 0.4 && b.w >= 3 && b.w <= headerW * 0.28);
  if (cands.length < 5) cands = blobs.filter((b) => b.h >= headerH * 0.3);
  if (cands.length < 5) return null;

  let best: Blob[] | null = null;
  let bestScore = Infinity;
  for (let i = 0; i <= cands.length - 5; i++) {
    const g = cands.slice(i, i + 5);
    const widths = g.map((b) => b.w);
    const heights = g.map((b) => b.h);
    const meanW = (widths[0] + widths[1] + widths[2] + widths[3]) / 4;
    if (meanW < 4) continue;
    let badGap = false;
    for (let k = 0; k < 4; k++) {
      const gap = g[k + 1].x0 - g[k].x1;
      if (gap > meanW * 2.2 || gap < -2) {
        badGap = true;
        break;
      }
    }
    if (badGap) continue;
    const skinny = g.filter((b) => b.w / b.h < 0.38).length;
    if (skinny >= 4) continue;
    let bodyVar = 0;
    for (let k = 0; k < 4; k++) bodyVar += (widths[k] - meanW) ** 2;
    bodyVar = Math.sqrt(bodyVar / 4) / (meanW + 1e-6);
    const hMean = heights.reduce((a, b) => a + b, 0) / 5;
    let hVar = 0;
    for (const hh of heights) hVar += (hh - hMean) ** 2;
    hVar = Math.sqrt(hVar / 5) / (hMean + 1e-6);
    const fill = (g[4].x1 - g[0].x0) / headerW;
    const score = bodyVar * 3 + hVar + Math.abs(0.45 - fill) * 0.4;
    if (score < bestScore) {
      bestScore = score;
      best = g;
    }
  }
  return best;
}

function tightCrop(ink: Uint8Array, w: number, blob: Blob) {
  const rows = new Float64Array(blob.h);
  const cols = new Float64Array(blob.w);
  for (let y = 0; y < blob.h; y++) {
    for (let x = 0; x < blob.w; x++) {
      if (!ink[(blob.y0 + y) * w + (blob.x0 + x)]) continue;
      rows[y] += 1;
      cols[x] += 1;
    }
  }
  for (let y = 0; y < blob.h; y++) rows[y] /= blob.w;
  for (let x = 0; x < blob.w; x++) cols[x] /= blob.h;

  let rowPeak = 0;
  for (let y = 0; y < blob.h; y++) if (rows[y] > rowPeak) rowPeak = rows[y];
  let colPeak = 0;
  for (let x = 0; x < blob.w; x++) if (cols[x] > colPeak) colPeak = cols[x];
  const rowThr = Math.max(0.2, rowPeak * 0.32);
  const colThr = Math.max(0.12, colPeak * 0.18);

  let y0 = 0;
  let y1 = blob.h;
  for (let y = 0; y < blob.h; y++) {
    if (rows[y] >= rowThr) {
      y0 = y;
      break;
    }
  }
  for (let y = blob.h - 1; y >= 0; y--) {
    if (rows[y] >= rowThr) {
      y1 = y + 1;
      break;
    }
  }
  let x0 = 0;
  let x1 = blob.w;
  for (let x = 0; x < blob.w; x++) {
    if (cols[x] >= colThr) {
      x0 = x;
      break;
    }
  }
  for (let x = blob.w - 1; x >= 0; x--) {
    if (cols[x] >= colThr) {
      x1 = x + 1;
      break;
    }
  }

  if (x1 - x0 < 3 || y1 - y0 < 6) {
    return { x0: blob.x0, x1: blob.x1, y0: blob.y0, y1: blob.y1, w: blob.w, h: blob.h };
  }
  return {
    x0: blob.x0 + x0,
    x1: blob.x0 + x1,
    y0: blob.y0 + y0,
    y1: blob.y0 + y1,
    w: x1 - x0,
    h: y1 - y0,
  };
}

function holeStats(ink: Uint8Array, stride: number, box: Blob) {
  const bw = box.w;
  const bh = box.h;
  const inv = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      inv[y * bw + x] = ink[(box.y0 + y) * stride + (box.x0 + x)] ? 0 : 1;
    }
  }
  const vis = new Uint8Array(bw * bh);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const i = y * bw + x;
    if (!inv[i] || vis[i]) return;
    vis[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < bw; x++) {
    push(x, 0);
    push(x, bh - 1);
  }
  for (let y = 0; y < bh; y++) {
    push(0, y);
    push(bw - 1, y);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % bw;
    const y = (i - x) / bw;
    if (x > 0) push(x - 1, y);
    if (x + 1 < bw) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < bh) push(x, y + 1);
  }
  let hole = 0;
  let ySum = 0;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const i = y * bw + x;
      if (inv[i] && !vis[i]) {
        hole += 1;
        ySum += y;
      }
    }
  }
  const n = bw * bh;
  if (!hole) return { frac: 0, yc: 0.5 };
  return { frac: hole / n, yc: ySum / hole / bh };
}

function grid4(ink: Uint8Array, stride: number, box: Blob) {
  const g = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const counts = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let y = 0; y < box.h; y++) {
    const ri = Math.min(3, Math.floor((y * 4) / box.h));
    for (let x = 0; x < box.w; x++) {
      const ci = Math.min(2, Math.floor((x * 3) / box.w));
      counts[ri][ci] += 1;
      if (ink[(box.y0 + y) * stride + (box.x0 + x)]) g[ri][ci] += 1;
    }
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      g[i][j] = counts[i][j] ? g[i][j] / counts[i][j] : 0;
    }
  }
  return g;
}

export function scoreDigitFeatures(g: number[][], aspect: number, holeFrac: number, holeYc: number, relWidth = 1) {
  const s = new Array<number>(10).fill(0);
  const r0 = g[0];
  const r1 = g[1];
  const r2 = g[2];
  const r3 = g[3];
  const L = (r0[0] + r1[0] + r2[0] + r3[0]) / 4;
  const M = (r0[1] + r1[1] + r2[1] + r3[1]) / 4;
  const R = (r0[2] + r1[2] + r2[2] + r3[2]) / 4;
  const mean = (row: number[]) => (row[0] + row[1] + row[2]) / 3;
  const narrow = aspect < 0.38 || relWidth < 0.72;
  const hasHole = holeFrac > 0.018;

  if (narrow) {
    s[1] += 2.4;
    for (let d = 0; d < 10; d++) if (d !== 1) s[d] -= 1.1;
  } else {
    s[1] -= 1.0;
    s[1] += 0.4 * (R - L);
  }

  if (hasHole) {
    for (const d of [1, 2, 3, 5, 7]) s[d] -= 0.9;
    for (const d of [0, 4, 6, 8, 9]) s[d] += 0.35;
  } else {
    for (const d of [0, 4, 6, 8, 9]) s[d] -= 1.0;
    for (const d of [2, 3, 5, 7]) s[d] += 0.25;
  }

  s[2] +=
    0.5 * mean(r0) +
    1.0 * (r0[2] - r0[0]) +
    0.8 * (r1[2] - r1[0]) +
    1.1 * mean(r2) +
    0.6 * r2[0] +
    0.4 * M -
    0.4 * r1[0];
  s[3] += 0.5 * mean(r0) + 0.5 * mean(r3) + 0.6 * R - 0.7 * L + 0.3 * r2[2];
  s[5] += 0.5 * mean(r0) + 0.6 * r1[0] - 0.4 * r1[2] + 0.4 * r2[2] + 0.4 * mean(r3);
  s[7] += 0.6 * mean(r0) + 0.7 * R - 0.6 * L - 0.5 * r2[0] - 0.3 * mean(r2);

  s[4] += 1.6 * (1 - r0[0]) + 0.5 * r0[2] + 0.5 * mean(r1) + 0.5 * R + 0.7 * (1 - r3[0]);
  if (r0[0] > 0.35) s[4] -= 1.4;
  if (hasHole && holeYc < 0.55) s[4] += 0.2;

  s[9] += 1.4 * r0[0] + 0.5 * mean(r0) + 0.6 * r1[0] + 0.4 * R;
  if (hasHole && holeYc < 0.42) s[9] += 0.8;
  else if (hasHole && holeYc < 0.55) s[9] += 0.3;
  if (r0[0] < 0.25) s[9] -= 1.2;

  s[0] += 0.4 * mean(r0) + 0.4 * mean(r3) + 0.3 * L + 0.3 * R - 0.6 * r1[1];
  if (hasHole && holeYc > 0.35 && holeYc < 0.65) s[0] += 0.7;

  s[6] += 0.5 * L + 0.4 * mean(r0) + 0.4 * mean(r3);
  if (hasHole && holeYc > 0.5) s[6] += 0.9;
  if (r0[0] < 0.2) s[6] -= 0.4;

  s[8] += 0.35 * (mean(r0) + mean(r3) + L + R) + 0.3 * M;
  if (holeFrac > 0.05) s[8] += 0.5;

  return s;
}

function classifyBlob(ink: Uint8Array, stride: number, blob: Blob, relWidth = 1) {
  const box = tightCrop(ink, stride, blob);
  if (box.h < 6 || box.w < 3) return new Array<number>(10).fill(-5);
  const holes = holeStats(ink, stride, box);
  const g = grid4(ink, stride, box);
  return scoreDigitFeatures(g, box.w / box.h, holes.frac, holes.yc, relWidth);
}

function argmax(scores: number[]) {
  let d = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[d]) d = i;
  return d;
}

function medianWidth(five: Blob[]) {
  const widths = five.map((b) => b.w).sort((a, b) => a - b);
  return widths[Math.floor(widths.length / 2)];
}

function decodeFive(
  five: Blob[],
  ink: Uint8Array,
  stride: number,
  known?: { has: (code: string) => boolean },
): Hit | null {
  const medianW = medianWidth(five);
  const matrix = five.map((b) => classifyBlob(ink, stride, b, b.w / medianW));
  const raw = matrix.map((s) => String(argmax(s))).join("");
  const conf = matrix.reduce((acc, row, i) => acc + row[raw.charCodeAt(i) - 48], 0);
  const height = five.reduce((acc, b) => acc + b.h, 0) / 5;

  let bestCode: string | null = null;
  let best = -Infinity;
  let second = -Infinity;
  const consider = (code: string) => {
    if (code.length !== 5) return;
    let tot = 0;
    for (let i = 0; i < 5; i++) {
      const d = code.charCodeAt(i) - 48;
      if (d < 0 || d > 9) return;
      tot += matrix[i][d];
    }
    if (tot > best) {
      second = best;
      best = tot;
      bestCode = code;
    } else if (tot > second) {
      second = tot;
    }
  };

  if (known && "forEach" in known && typeof (known as Map<string, unknown>).forEach === "function") {
    (known as Map<string, unknown>).forEach((_v, code) => consider(code));
  }

  const rawIn = known ? known.has(raw) : true;
  let code = raw;
  if (known) {
    const rawScore = rawIn ? conf : -Infinity;
    if (rawIn && (!bestCode || best - rawScore < 0.8)) {
      code = raw;
    } else if (bestCode && best - second >= 0.5) {
      code = bestCode;
    } else if (rawIn) {
      code = raw;
    } else {
      return null;
    }
  }
  return { code, conf, height, inCatalog: known ? known.has(code) : true };
}

function lumSpread(lum: Float64Array, w: number, h: number) {
  const row = new Float64Array(h);
  for (let y = 0; y < h; y++) {
    let min = 255;
    let max = 0;
    for (let x = 0; x < w; x++) {
      const v = lum[y * w + x];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    row[y] = max - min;
  }
  return row;
}

function bandMedian(lum: Float64Array, stride: number, x0: number, x1: number, y0: number, y1: number) {
  const hist = new Uint32Array(256);
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let v = lum[y * stride + x];
      if (v < 0) v = 0;
      if (v > 255) v = 255;
      hist[v | 0] += 1;
      n += 1;
    }
  }
  const mid = n / 2;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= mid) return i;
  }
  return 128;
}

function medianInkRange(
  lum: Float64Array,
  stride: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  sign: 1 | -1,
  delta: number,
) {
  const med = bandMedian(lum, stride, x0, x1, y0, y1);
  const w = x1 - x0;
  const h = y1 - y0;
  const ink = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = lum[(y0 + y) * stride + (x0 + x)];
      ink[y * w + x] = sign * (v - med) > delta ? 1 : 0;
    }
  }
  return { ink, w, h };
}

function collectHits(lum: Float64Array, w: number, h: number, known?: { has: (code: string) => boolean }) {
  const hits: Hit[] = [];
  const spread = lumSpread(lum, w, h);
  const heights = [...new Set([
    Math.max(16, Math.min(48, Math.round(h * 0.14))),
    Math.max(22, Math.min(72, Math.round(h * 0.22))),
    Math.max(28, Math.min(96, Math.round(h * 0.32))),
  ])].sort((a, b) => a - b);

  const xRanges: Array<[number, number]> = [[0, w]];
  if (w > 280) {
    const third = Math.floor(w / 2);
    xRanges.push([0, Math.min(w, third + Math.floor(w * 0.15))]);
    xRanges.push([Math.max(0, w - third - Math.floor(w * 0.15)), w]);
  }

  for (const bh of heights) {
    const step = Math.max(5, Math.floor(bh * 0.32));
    for (let y0 = 0; y0 + bh <= h; y0 += step) {
      const y1 = y0 + bh;
      let spr = 0;
      for (let y = y0; y < y1; y++) spr += spread[y];
      if (spr / bh < 22) continue;
      for (const [x0, x1] of xRanges) {
        const rw = x1 - x0;
        if (rw < 60) continue;
        for (const sign of [1, -1] as const) {
          for (const delta of [10, 18]) {
            const band = medianInkRange(lum, w, x0, x1, y0, y1, sign, delta);
            const blobs = blobsFromInk(band.ink, band.w, band.h);
            const five = pickFive(blobs, band.h, band.w);
            if (!five) continue;
            const hit = decodeFive(five, band.ink, band.w, known);
            if (hit) hits.push(hit);
          }
        }
      }
    }
  }
  return hits;
}

function pickHit(hits: Hit[], known?: { has: (code: string) => boolean }) {
  if (hits.length === 0) return null;
  const catalogued = known ? hits.filter((h) => h.inCatalog) : hits;
  const pool = catalogued.length ? catalogued : known ? [] : hits;
  if (pool.length === 0) return null;
  const tally = new Map<string, { n: number; conf: number; height: number }>();
  for (const h of pool) {
    const t = tally.get(h.code) ?? { n: 0, conf: -Infinity, height: 0 };
    t.n += 1;
    if (h.conf > t.conf) t.conf = h.conf;
    if (h.height > t.height) t.height = h.height;
    tally.set(h.code, t);
  }
  let bestCode: string | null = null;
  let best = -Infinity;
  for (const [code, t] of tally) {
    const digits = [...code];
    const same = digits.every((d) => d === digits[0]);
    if (same) continue;
    const ones = digits.filter((d) => d === "1").length;
    const score = t.conf * 2 + t.n + t.height * 0.06 - (ones >= 4 ? 8 : 0);
    if (score > best) {
      best = score;
      bestCode = code;
    }
  }
  return bestCode;
}

/**
 * Find a 5-digit stop code in a photo, on any background colour.
 * Prefers a catalog match when `known` is provided.
 */
export function readStopCode(
  source: PixelSource | ImageData,
  known?: { has: (code: string) => boolean },
): string | null {
  const src: PixelSource = {
    data: source.data,
    width: source.width,
    height: source.height,
    channels: "channels" in source && source.channels ? source.channels : 4,
  };
  return pickHit(collectHits(luminanceOf(src), src.width, src.height, known), known);
}

/** Draw a video/image into ImageData, scaled so width ≤ maxW. */
export function rasterizeToImageData(
  img: CanvasImageSource & { width?: number; height?: number },
  sw: number,
  sh: number,
  maxW = 960,
): ImageData | null {
  if (!sw || !sh) return null;
  const scale = Math.min(1, maxW / sw);
  const w = Math.max(8, Math.round(sw * scale));
  const h = Math.max(8, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
