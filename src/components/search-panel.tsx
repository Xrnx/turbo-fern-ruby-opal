import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { allStops, searchStops, type Stop } from "@/lib/stops";
import { Input } from "@/components/ui/input";
import { Overlay } from "@/components/ui/overlay";
import { StopRow } from "@/components/stop-row";

export function SearchPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void allStops().then((list) => {
      if (!cancelled) setStops(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => searchStops(stops, query, 24), [stops, query]);

  return (
    <Overlay open={open} onOpenChange={onOpenChange} title="Search stops" closeLabel="Close search">
      <label className="sr-only" htmlFor="stop-search">
        Stop name or code
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          id="stop-search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Amber Gdns, Orchard, 92241"
          className="pl-10"
        />
      </div>
      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {query.trim().length === 0 ? (
          <p className="px-1 text-sm text-muted">Type a stop name, road, or 5-digit code.</p>
        ) : results.length === 0 ? (
          <p className="px-1 text-sm text-muted">No stops match “{query.trim()}”.</p>
        ) : (
          results.map((stop) => (
            <StopRow key={stop.code} stop={stop} onPick={() => onOpenChange(false)} />
          ))
        )}
      </div>
    </Overlay>
  );
}
