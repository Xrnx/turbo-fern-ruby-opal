import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Keypad } from "@/components/keypad";
import { NearbyPanel } from "@/components/nearby-panel";
import { SearchPanel } from "@/components/search-panel";
import { StopRow } from "@/components/stop-row";
import { useSavedStops } from "@/lib/saved-stops";
import { getStop, SUGGESTED_STOPS, type Stop } from "@/lib/stops";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [code, setCode] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const saved = useSavedStops((s) => s.saved);
  const recents = useSavedStops((s) => s.recents);
  const [catalog, setCatalog] = useState<Record<string, Stop>>({});

  const heading = saved.length > 0 ? "Saved" : recents.length > 0 ? "Recent" : "Try a stop";
  const codes = useMemo(
    () => (saved.length > 0 ? saved : recents.length > 0 ? recents : [...SUGGESTED_STOPS]),
    [saved, recents],
  );
  const codeKey = codes.join("|");

  useEffect(() => {
    let cancelled = false;
    const list = codeKey.split("|").filter(Boolean);
    void Promise.all(list.map((c) => getStop(c))).then((rows) => {
      if (cancelled) return;
      const next: Record<string, Stop> = {};
      rows.forEach((stop, i) => {
        const key = list[i];
        if (stop && key) next[key] = stop;
      });
      setCatalog(next);
    });
    return () => {
      cancelled = true;
    };
  }, [codeKey]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="halt-rise mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Singapore buses</p>
        <h1 className="mt-2 font-display text-6xl font-bold leading-none tracking-tight">Halt</h1>
        <p className="mt-3 max-w-sm text-sm text-muted text-pretty">
          Type the 5-digit code on the pole. Incoming buses show up immediately — no menus, no extra taps.
        </p>
      </header>

      <section className="halt-rise halt-rise-1">
        <Keypad
          code={code}
          onCodeChange={setCode}
          onNearby={() => setNearbyOpen(true)}
          onSearch={() => setSearchOpen(true)}
        />
      </section>

      <section className="halt-rise halt-rise-2 mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted">{heading}</h2>
        <div className="space-y-2">
          {codes.map((c) => {
            const stop = catalog[c];
            if (!stop) {
              return <div key={c} className="h-20 animate-pulse rounded-lg bg-card" />;
            }
            return <StopRow key={c} stop={stop} />;
          })}
        </div>
      </section>

      <SearchPanel open={searchOpen} onOpenChange={setSearchOpen} />
      <NearbyPanel open={nearbyOpen} onOpenChange={setNearbyOpen} />
    </main>
  );
}
