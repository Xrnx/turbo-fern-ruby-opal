/** Read the 5-digit LTA pole code from a photo (white condensed digits on teal). */

export type PixelSource = {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
  /** 4 for ImageData, 3 for RGB buffers. Default 4. */
  channels?: 3 | 4;
};

type Blob = { x0: number; x1: number; y0: number; y1: number; w: number; h: number };
type HeaderBox = { x0: number; x1: number; y0: number; y1: number };

function isTeal(r: number, g: number, b: number) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx >= 70 && mx - mn >= 25 && g >= r + 15 && b >= r + 20 && b >= g - 40 && g >= b - 55 && b >= 70;
}

function isPale(r: number, g: number, b: number) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx ? (mx - mn) / mx : 0;
  const lum = (r + g + b) / 3;
  return sat < 0.22 && lum > 185;
}

function isInk(r: number, g: number, b: number) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx ? (mx - mn) / mx : 0;
  const val = mx / 255;
  return sat <= 0.45 && val >= 0.68;
}

function pixel(src: PixelSource, x: number, y: number) {
  const ch = src.channels ?? 4;
  const i = (y * src.width + x) * ch;
  return [src.data[i], src.data[i + 1], src.data[i + 2]] as const;
}

function spans(values: Float64Array, threshold: number, minLen: number) {
  const out: Array<[number, number]> = [];
  const n = values.length;
  let i = 0;
  while (i < n) {
    if (values[i] <= threshold) {
      i += 1;
      continue;
    }
    let j = i + 1;
    while (j < n && values[j] > threshold) j += 1;
    if (j - i >= minLen) out.push([i, j]);
    i = j;
  }
  return out;
}

function findHeaders(src: PixelSource): HeaderBox[] {
  const w = src.width;
  const h = src.height;
  const tealCol = new Float64Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(src, x, y);
      if (isTeal(r, g, b)) tealCol[x] += 1;
    }
  }
  for (let x = 0; x < w; x++) tealCol[x] /= h;

  const xSpans = spans(tealCol, 0.12, Math.max(40, Math.floor(w / 18)));
  const headers: HeaderBox[] = [];

  for (const [sx0, sx1] of xSpans) {
    const pw = sx1 - sx0;
    const parts: Array<[number, number]> = [[sx0, sx1]];
    if (pw > w * 0.42) {
      const tcol = new Float64Array(pw);
      for (let y = 0; y < h; y++) {
        for (let x = sx0; x < sx1; x++) {
          const [r, g, b] = pixel(src, x, y);
          if (isTeal(r, g, b)) tcol[x - sx0] += 1;
        }
      }
      for (let i = 0; i < pw; i++) tcol[i] /= h;
      const mid0 = Math.floor(pw * 0.28);
      const mid1 = Math.floor(pw * 0.72);
      let gi = mid0;
      let minv = tcol[mid0];
      for (let i = mid0; i < mid1; i++) {
        if (tcol[i] < minv) {
          minv = tcol[i];
          gi = i;
        }
      }
      if (minv < 0.2) {
        parts.length = 0;
        parts.push([sx0, sx0 + gi], [sx0 + gi, sx1]);
      }
    }

    for (const [a, c] of parts) {
      if (c - a < 50) continue;
      const spanW = c - a;
      const tealRow = new Float64Array(h);
      const paleRow = new Float64Array(h);
      for (let y = 0; y < h; y++) {
        let t = 0;
        let p = 0;
        for (let x = a; x < c; x++) {
          const [r, g, b] = pixel(src, x, y);
          if (isTeal(r, g, b)) t += 1;
          if (isPale(r, g, b)) p += 1;
        }
        tealRow[y] = t / spanW;
        paleRow[y] = p / spanW;
      }

      const nameBands = spans(paleRow, 0.45, Math.max(5, Math.floor(h / 100)));
      let usedName = false;
      for (const [wy0, wy1] of nameBands) {
        const nh = wy1 - wy0;
        const hy1 = wy0;
        const floor = Math.max(0, wy0 - Math.floor(nh * 1.25));
        let hy0 = hy1;
        for (let y = hy1 - 1; y >= floor; y--) {
          if (tealRow[y] <= 0.72) break;
          hy0 = y;
        }
        if (hy1 - hy0 >= 10) {
          headers.push({ x0: a, x1: c, y0: hy0, y1: hy1 });
          usedName = true;
        }
      }

      if (!usedName) {
        const tealBands = spans(tealRow, 0.72, Math.max(10, Math.floor(h / 80)));
        for (const [ty0, ty1] of tealBands) {
          const th = ty1 - ty0;
          if (th >= 10 && th <= Math.max(90, Math.floor(spanW * 0.55))) {
            headers.push({ x0: a, x1: c, y0: ty0, y1: ty1 });
          }
        }
      }
    }
  }
  return headers;
}

function headerInk(src: PixelSource, box: HeaderBox) {
  const w = box.x1 - box.x0;
  const fullH = box.y1 - box.y0;
  const full = new Uint8Array(w * fullH);
  const row = new Float64Array(fullH);
  for (let y = 0; y < fullH; y++) {
    let n = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(src, box.x0 + x, box.y0 + y);
      if (isInk(r, g, b)) {
        full[y * w + x] = 1;
        n += 1;
      }
    }
    row[y] = n / w;
  }
  let peak = 0;
  for (let y = 0; y < fullH; y++) if (row[y] > peak) peak = row[y];
  const thr = Math.max(0.02, peak * 0.08);
  let bestStart = 0;
  let bestLen = 0;
  let runStart = 0;
  let runLen = 0;
  for (let y = 0; y <= fullH; y++) {
    const on = y < fullH && row[y] >= thr;
    if (on) {
      if (runLen === 0) runStart = y;
      runLen += 1;
    } else {
      if (runLen > bestLen) {
        bestLen = runLen;
        bestStart = runStart;
      }
      runLen = 0;
    }
  }
  const pad = Math.max(2, Math.floor(bestLen * 0.08));
  const y0 = Math.max(0, bestStart - pad);
  const y1 = Math.min(fullH, bestStart + bestLen + pad);
  const h = Math.max(8, y1 - y0);
  const ink = new Uint8Array(w * h);
  ink.set(full.subarray(y0 * w, y1 * w));
  return { ink, w, h };
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
    const bodyMean = meanW;
    let bodyVar = 0;
    for (let k = 0; k < 4; k++) bodyVar += (widths[k] - bodyMean) ** 2;
    bodyVar = Math.sqrt(bodyVar / 4) / (bodyMean + 1e-6);
    const hMean = heights.reduce((a, b) => a + b, 0) / 5;
    let hVar = 0;
    for (const hh of heights) hVar += (hh - hMean) ** 2;
    hVar = Math.sqrt(hVar / 5) / (hMean + 1e-6);
    const fill = (g[4].x1 - g[0].x0) / headerW;
    const score = bodyVar * 3 + hVar + Math.abs(0.5 - fill);
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
) {
  const medianW = medianWidth(five);
  const matrix = five.map((b) => classifyBlob(ink, stride, b, b.w / medianW));
  const raw = matrix.map((s) => String(argmax(s))).join("");
  if (!known) return raw;

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

  if ("forEach" in known && typeof (known as Map<string, unknown>).forEach === "function") {
    (known as Map<string, unknown>).forEach((_v, code) => consider(code));
  }

  const rawIn = known.has(raw);
  if (rawIn && (!bestCode || best - matrix.reduce((acc, row, i) => acc + row[raw.charCodeAt(i) - 48], 0) < 0.8)) {
    return raw;
  }
  if (bestCode && best - second >= 0.5) return bestCode;
  return rawIn ? raw : null;
}

function readHeader(src: PixelSource, box: HeaderBox, known?: { has: (code: string) => boolean }) {
  const { ink, w, h } = headerInk(src, box);
  const blobs = blobsFromInk(ink, w, h);
  const five = pickFive(blobs, h, w);
  if (!five) return null;
  return decodeFive(five, ink, w, known);
}

/** @internal test helper */
export function inspectStopCode(source: PixelSource | ImageData) {
  const src: PixelSource = {
    data: source.data,
    width: source.width,
    height: source.height,
    channels: "channels" in source && source.channels ? source.channels : 4,
  };
  return findHeaders(src).map((box) => {
    const { ink, w, h } = headerInk(src, box);
    const blobs = blobsFromInk(ink, w, h);
    const five = pickFive(blobs, h, w);
    if (!five) {
      return { box, size: [w, h] as const, blobWidths: blobs.map((b) => b.w), raw: null as string | null, digits: [] };
    }
    const medianW = medianWidth(five);
    const digits = five.map((b) => {
      const tight = tightCrop(ink, w, b);
      const holes = holeStats(ink, w, tight);
      const g = grid4(ink, w, tight);
      const scores = classifyBlob(ink, w, b, b.w / medianW);
      const ranked = scores
        .map((s, d) => ({ d, s: Math.round(s * 100) / 100 }))
        .sort((a, c) => c.s - a.s)
        .slice(0, 4);
      return { box: tight, aspect: +((tight.w / tight.h).toFixed(3)), holes, g, pick: argmax(scores), ranked };
    });
    return {
      box,
      size: [w, h] as const,
      blobWidths: five.map((b) => b.w),
      raw: digits.map((d) => String(d.pick)).join(""),
      digits,
    };
  });
}

/**
 * Find LTA teal headers in a photo and read the 5-digit stop code.
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
  const headers = findHeaders(src);
  let fallback: string | null = null;
  for (const box of headers) {
    const code = readHeader(src, box, known);
    if (!code) continue;
    if (!known || known.has(code)) return code;
    fallback ??= code;
  }
  return fallback;
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
