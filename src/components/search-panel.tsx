import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import { allStops, searchStops, type Stop } from "@/lib/stops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80" />
        <Dialog.Content
          className="fixed inset-x-0 top-0 z-50 mx-auto flex h-dvh w-full max-w-lg flex-col bg-background px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]"
          aria-describedby={undefined}
        >
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-medium">Search stops</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close search">
                <X />
              </Button>
            </Dialog.Close>
          </div>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
