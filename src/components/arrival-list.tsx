import { Accessibility } from "lucide-react";
import {
  deckLabel,
  formatEta,
  loadLabel,
  operatorName,
  type BusEta,
  type BusService,
} from "@/lib/arrivals";
import type { Stop } from "@/lib/stops";
import { cn } from "@/lib/utils";

function LoadPips({ load }: { load: string | null }) {
  const filled = load === "LSD" ? 3 : load === "SDA" ? 2 : load === "SEA" ? 1 : 0;
  const tone = load === "LSD" ? "bg-bad" : load === "SDA" ? "bg-warn" : "bg-ok";
  return (
    <span className="inline-flex items-end gap-0.5" aria-label={loadLabel(load) ?? "Load unknown"}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "w-1 rounded-full",
            n === 1 ? "h-2" : n === 2 ? "h-2.5" : "h-3.5",
            n <= filled ? tone : "bg-border",
          )}
        />
      ))}
    </span>
  );
}

function EtaChip({ eta }: { eta: BusEta | null }) {
  if (!eta) {
    return <span className="w-14 text-right font-display text-2xl tabular-nums text-subtle">—</span>;
  }
  const { label, unit, arriving } = formatEta(eta.duration_ms);
  return (
    <span className="flex w-14 flex-col items-end leading-none">
      <span
        className={cn(
          "font-display text-3xl font-semibold tabular-nums tracking-tight",
          arriving ? "text-ok" : "text-foreground",
        )}
      >
        {label}
      </span>
      {unit ? <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">{unit}</span> : null}
    </span>
  );
}

function destinationFor(svc: BusService, stops: Map<string, Stop>) {
  const code = svc.next?.destination_code ?? svc.next2?.destination_code ?? svc.next3?.destination_code;
  if (!code) return operatorName(svc.operator);
  if (svc.next?.origin_code && svc.next.origin_code === code) {
    return stops.get(code)?.name ?? "Loop";
  }
  return stops.get(code)?.name ?? code;
}

export function ArrivalList({
  services,
  stopMap,
}: {
  services: BusService[];
  stopMap: Map<string, Stop>;
}) {
  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
        <p className="text-base font-medium">No buses right now</p>
        <p className="mt-2 text-sm text-muted">This stop has no incoming services at the moment.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {services.map((svc, i) => {
        const dest = destinationFor(svc, stopMap);
        const eta = svc.next;
        const wab = eta?.feature === "WAB";
        const deck = deckLabel(eta?.type ?? null);
        const load = loadLabel(eta?.load ?? null);
        return (
          <li
            key={svc.no}
            className={cn(
              "halt-rise rounded-xl border border-border bg-card px-4 py-3.5",
              i < 5 ? `halt-rise-${Math.min(i + 1, 4)}` : "",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-14">
                <p className="font-display text-4xl font-bold leading-none tracking-tight">{svc.no}</p>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="truncate text-sm font-medium">{dest}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span>{operatorName(svc.operator)}</span>
                  {load ? (
                    <span className="inline-flex items-center gap-1.5">
                      <LoadPips load={eta?.load ?? null} />
                      {load}
                    </span>
                  ) : null}
                  {deck ? <span>{deck}</span> : null}
                  {wab ? (
                    <span className="inline-flex items-center gap-1">
                      <Accessibility className="size-3" />
                      Accessible
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-start gap-2 pt-0.5">
                <EtaChip eta={svc.next} />
                <EtaChip eta={svc.next2} />
                <span className="hidden sm:flex">
                  <EtaChip eta={svc.next3} />
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
