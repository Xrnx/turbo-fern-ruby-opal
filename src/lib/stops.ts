export type Stop = {
  code: string;
  lng: number;
  lat: number;
  name: string;
  road: string;
};

type RawStops = Record<string, [number, number, string, string]>;

let cache: Map<string, Stop> | null = null;
let listCache: Stop[] | null = null;
let pending: Promise<Map<string, Stop>> | null = null;

function toStop(code: string, raw: [number, number, string, string]): Stop {
  return {
    code,
    lng: raw[0],
    lat: raw[1],
    name: raw[2],
    road: raw[3],
  };
}

export async function loadStops(): Promise<Map<string, Stop>> {
  if (cache) return cache;
  if (!pending) {
    pending = fetch("/data/stops.json")
      .then((res) => {
        if (!res.ok) throw new Error("Could not load bus stops");
        return res.json() as Promise<RawStops>;
      })
      .then((raw) => {
        const map = new Map<string, Stop>();
        for (const [code, value] of Object.entries(raw)) {
          map.set(code, toStop(code, value));
        }
        cache = map;
        return map;
      });
  }
  return pending;
}

export async function getStop(code: string): Promise<Stop | undefined> {
  const map = await loadStops();
  return map.get(code);
}

export async function allStops(): Promise<Stop[]> {
  if (listCache) return listCache;
  const map = await loadStops();
  listCache = Array.from(map.values());
  return listCache;
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
