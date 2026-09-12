import { useEffect, useState } from "react";

export type Stop = {
  code: string;
  lng: number;
  lat: number;
  name: string;
  road: string;
};

type RawStops = Record<string, [number, number, string, string]>;

const BUNDLE_URL = "/data/stops.json";
const REMOTE_URL = "https://data.busrouter.sg/v1/stops.json";
const STORAGE_KEY = "halt-stops-v1";

let cache: Map<string, Stop> | null = null;
let listCache: Stop[] | null = null;
let pending: Promise<Map<string, Stop>> | null = null;
let revalidateStarted = false;
const listeners = new Set<() => void>();

function toStop(code: string, raw: [number, number, string, string]): Stop {
  return {
    code,
    lng: raw[0],
    lat: raw[1],
    name: raw[2],
    road: raw[3],
  };
}

function parseRaw(value: unknown): RawStops | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length < 100) return null;
  const sample = entries.slice(0, 8);
  for (const [code, row] of sample) {
    if (!/^\d{5}$/.test(code) || !Array.isArray(row) || row.length < 4) return null;
    if (typeof row[0] !== "number" || typeof row[1] !== "number") return null;
    if (typeof row[2] !== "string" || typeof row[3] !== "string") return null;
  }
  return value as RawStops;
}

function toMap(raw: RawStops): Map<string, Stop> {
  const map = new Map<string, Stop>();
  for (const [code, value] of Object.entries(raw)) {
    if (!/^\d{5}$/.test(code) || !Array.isArray(value) || value.length < 4) continue;
    map.set(code, toStop(code, value as [number, number, string, string]));
  }
  return map;
}

function apply(raw: RawStops) {
  cache = toMap(raw);
  listCache = Array.from(cache.values());
  for (const listener of listeners) listener();
}

function readLocal(): RawStops | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { stops?: unknown };
    return parseRaw(parsed?.stops);
  } catch {
    return null;
  }
}

function writeLocal(raw: RawStops) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ updatedAt: Date.now(), stops: raw }));
  } catch {
    /* quota — keep going with memory */
  }
}

async function fetchRaw(url: string): Promise<RawStops> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load bus stops");
  const parsed = parseRaw(await res.json());
  if (!parsed) throw new Error("Unexpected bus stop catalog");
  return parsed;
}

async function revalidate() {
  if (revalidateStarted) return;
  revalidateStarted = true;
  try {
    const raw = await fetchRaw(REMOTE_URL);
    writeLocal(raw);
    apply(raw);
  } catch {
    revalidateStarted = false;
  }
}

async function bootstrap(): Promise<Map<string, Stop>> {
  const local = readLocal();
  if (local) {
    apply(local);
    void revalidate();
    return cache!;
  }
  const bundled = await fetchRaw(BUNDLE_URL);
  apply(bundled);
  void revalidate();
  return cache!;
}

export function subscribeStops(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function loadStops(): Promise<Map<string, Stop>> {
  if (cache) {
    void revalidate();
    return cache;
  }
  if (!pending) pending = bootstrap();
  return pending;
}

export async function getStop(code: string): Promise<Stop | undefined> {
  const map = await loadStops();
  return map.get(code);
}

export async function allStops(): Promise<Stop[]> {
  await loadStops();
  return listCache ?? [];
}

export function useStopMap() {
  const [map, setMap] = useState<Map<string, Stop>>(() => {
    if (cache) return cache;
    const local = readLocal();
    if (local) apply(local);
    return cache ?? new Map();
  });
  useEffect(() => {
    let live = true;
    void loadStops().then((next) => {
      if (live) setMap(next);
    });
    return subscribeStops(() => {
      if (live && cache) setMap(cache);
    });
  }, []);
  return map;
}

export function searchStops(stops: Stop[], query: string, limit = 20): Stop[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const digits = /^\d+$/.test(q);
  const scored: { stop: Stop; score: number }[] = [];
  for (const stop of stops) {
    const name = stop.name.toLowerCase();
    const road = stop.road.toLowerCase();
    let score = -1;
    if (digits) {
      if (stop.code === q) score = 0;
      else if (stop.code.startsWith(q)) score = 1;
      else if (stop.code.includes(q)) score = 4;
    } else {
      if (name === q) score = 0;
      else if (name.startsWith(q)) score = 1;
      else if (name.includes(q)) score = 2;
      else if (road.startsWith(q)) score = 3;
      else if (road.includes(q)) score = 4;
    }
    if (score >= 0) scored.push({ stop, score });
  }
  scored.sort((a, b) => a.score - b.score || a.stop.name.localeCompare(b.stop.name));
  return scored.slice(0, limit).map((s) => s.stop);
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

export function nearbyStops(
  stops: Stop[],
  lat: number,
  lng: number,
  limit = 12,
): { stop: Stop; meters: number }[] {
  const ranked = stops
    .map((stop) => ({ stop, meters: distanceMeters(lat, lng, stop.lat, stop.lng) }))
    .sort((a, b) => a.meters - b.meters);
  return ranked.slice(0, limit);
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export const SUGGESTED_STOPS = ["92241", "01012", "75009", "08031", "46009"] as const;
