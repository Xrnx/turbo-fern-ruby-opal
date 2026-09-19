import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readStopCode, scoreDigitFeatures } from "./read-stop-code.ts";

const here = dirname(fileURLToPath(import.meta.url));
const catalog = new Map(
  Object.keys(JSON.parse(readFileSync(join(here, "../../public/data/stops.json"), "utf8"))).map(
    (code) => [code, true] as const,
  ),
);

function loadPpmGz(name: string) {
  const buf = gunzipSync(readFileSync(join(here, "fixtures", name)));
  const text = buf.toString("latin1");
  if (!text.startsWith("P6")) throw new Error("not P6");
  const header = /^P6\n(\d+) (\d+)\n255\n/.exec(text);
  if (!header) throw new Error("bad ppm header");
  const width = Number(header[1]);
  const height = Number(header[2]);
  const data = buf.subarray(header[0].length);
  if (data.length < width * height * 3) throw new Error("truncated ppm");
  return { data, width, height, channels: 3 as const };
}

describe("scoreDigitFeatures", () => {
  it("reads 9 vs 4 vs 2 vs 1 the way LTA condensed digits look", () => {
    const nine = scoreDigitFeatures(
      [
        [0.71, 0.51, 0.66],
        [0.68, 0.53, 0.96],
        [0.29, 0.51, 0.48],
        [0.12, 0.15, 0.12],
      ],
      0.485,
      0.072,
      0.22,
    );
    const two = scoreDigitFeatures(
      [
        [0.27, 0.51, 0.81],
        [0.0, 0.44, 0.52],
        [0.72, 0.81, 0.56],
        [0.12, 0.12, 0.12],
      ],
      0.47,
      0.001,
      0.42,
    );
    const four = scoreDigitFeatures(
      [
        [0.01, 0.52, 0.64],
        [0.68, 0.7, 0.73],
        [0.19, 0.44, 0.69],
        [0.12, 0.12, 0.13],
      ],
      0.477,
      0.026,
      0.35,
    );
    const one = scoreDigitFeatures(
      [
        [0.44, 0.62, 1.0],
        [0.0, 0.33, 1.0],
        [0.0, 0.42, 0.99],
        [0.12, 0.09, 0.12],
      ],
      0.308,
      0.001,
      0.14,
    );
    const argmax = (s: number[]) => s.indexOf(Math.max(...s));
    assert.equal(argmax(nine), 9);
    assert.equal(argmax(two), 2);
    assert.equal(argmax(four), 4);
    assert.equal(argmax(one), 1);
  });
});

describe("readStopCode", () => {
  it("reads 92241 from the Amber Gdns pole plate", () => {
    const img = loadPpmGz("stop-92241.ppm.gz");
    assert.equal(readStopCode(img, catalog), "92241");
  });

  it("does not snap 92241 to a Hamming-1 neighbour like 42241", () => {
    assert.equal(catalog.has("42241"), true);
    assert.equal(catalog.has("92249"), true);
    const img = loadPpmGz("stop-92241.ppm.gz");
    assert.equal(readStopCode(img, catalog), "92241");
  });
});
