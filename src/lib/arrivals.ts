import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type BusEta = {
  time: string | null;
  duration_ms: number | null;
  load: string | null;
  feature: string | null;
  type: string | null;
  destination_code: string | null;
  origin_code: string | null;
  monitored: number | null;
};

export type BusService = {
  no: string;
  operator: string;
  next: BusEta | null;
  next2: BusEta | null;
  next3: BusEta | null;
};

export type ArrivalPayload = {
  code: string;
  services: BusService[];
};

type RawEta = {
  time?: string | null;
  duration_ms?: number | null;
  load?: string | null;
  feature?: string | null;
  type?: string | null;
  destination_code?: string | null;
  origin_code?: string | null;
  monitored?: number | null;
};

type RawService = {
  no?: string;
  operator?: string;
  next?: RawEta | null;
  next2?: RawEta | null;
  subsequent?: RawEta | null;
  next3?: RawEta | null;
};

const ARRIVELAH_URL = "https://arrivelah2.busrouter.sg/";
const FETCH_MS = 8_000;

function normalizeEta(raw: RawEta | null | undefined): BusEta | null {
  if (!raw || (!raw.time && raw.duration_ms == null)) return null;
  return {
    time: raw.time ?? null,
    duration_ms: typeof raw.duration_ms === "number" ? raw.duration_ms : null,
    load: raw.load ?? null,
    feature: raw.feature ?? null,
    type: raw.type ?? null,
    destination_code: raw.destination_code ?? null,
    origin_code: raw.origin_code ?? null,
    monitored: typeof raw.monitored === "number" ? raw.monitored : null,
  };
}

function parsePayload(code: string, json: { services?: RawService[] }): ArrivalPayload {
  const services: BusService[] = (json.services ?? [])
    .map((svc) => ({
      no: String(svc.no ?? ""),
      operator: String(svc.operator ?? ""),
      next: normalizeEta(svc.next),
      next2: normalizeEta(svc.next2 ?? svc.subsequent),
      next3: normalizeEta(svc.next3),
    }))
    .filter((svc) => svc.no && (svc.next || svc.next2 || svc.next3));

  services.sort((a, b) => {
    const aMs = a.next?.duration_ms ?? Number.POSITIVE_INFINITY;
    const bMs = b.next?.duration_ms ?? Number.POSITIVE_INFINITY;
    if (aMs !== bMs) return aMs - bMs;
    return a.no.localeCompare(b.no, "en", { numeric: true, sensitivity: "base" });
  });

  return { code, services };
}

async function fetchArriveLah(code: string, timeoutMs: number): Promise<ArrivalPayload> {
  const res = await fetch(`${ARRIVELAH_URL}?id=${encodeURIComponent(code)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error("Could not load arrivals. Try again in a moment.");
  }
  return parsePayload(code, (await res.json()) as { services?: RawService[] });
}

function isTimeoutError(err: unknown) {
  if (err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError")) return true;
  return err instanceof Error && /aborted|timeout/i.test(err.message);
}

function isBlockedError(err: unknown) {
  if (isTimeoutError(err)) return false;
  if (err instanceof TypeError) return true;
  return err instanceof Error && /failed to fetch|load failed|networkerror/i.test(err.message);
}

function asArrivalError(err: unknown): Error {
  if (isTimeoutError(err)) {
    return new Error("Arrivals took too long. Refresh to try again.");
  }
  if (err instanceof Error) return err;
  return new Error("Could not load arrivals. Try again in a moment.");
}

export const getArrivals = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().regex(/^\d{5}$/) }))
  .handler(async ({ data }): Promise<ArrivalPayload> => {
    try {
      return await fetchArriveLah(data.code, 6_000);
    } catch (err) {
      throw asArrivalError(err);
    }
  });

export async function loadArrivals(code: string): Promise<ArrivalPayload> {
  try {
    return await fetchArriveLah(code, FETCH_MS);
  } catch (err) {
    if (!isBlockedError(err)) throw asArrivalError(err);
    try {
      return await getArrivals({ data: { code } });
    } catch (proxyErr) {
      throw asArrivalError(proxyErr);
    }
  }
}

export function formatEta(ms: number | null | undefined): { label: string; unit: string; arriving: boolean } {
  if (ms == null) return { label: "—", unit: "", arriving: false };
  if (ms <= 45_000) return { label: "Arr", unit: "", arriving: true };
  const mins = Math.max(1, Math.round(ms / 60_000));
  return { label: String(mins), unit: mins === 1 ? "min" : "min", arriving: false };
}

export function operatorName(code: string) {
  switch (code) {
    case "SBST":
      return "SBS Transit";
    case "SMRT":
      return "SMRT";
    case "TTS":
      return "Tower Transit";
    case "GAS":
      return "Go-Ahead";
    default:
      return code || "Bus";
  }
}

export function loadLabel(load: string | null) {
  switch (load) {
    case "SEA":
      return "Seats";
    case "SDA":
      return "Standing";
    case "LSD":
      return "Limited";
    default:
      return null;
  }
}

export function deckLabel(type: string | null) {
  switch (type) {
    case "DD":
      return "Double deck";
    case "BD":
      return "Bendy";
    case "SD":
      return "Single";
    default:
      return null;
  }
}

export const ARRIVAL_REFRESH_MS = 15_000;
