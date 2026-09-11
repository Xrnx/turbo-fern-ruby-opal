import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { allStops, formatDistance, nearbyStops, type Stop } from "@/lib/stops";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StopRow } from "@/components/stop-row";

type NearbyState =
  | { status: "loading" }
  | { status: "denied"; message: string }
  | { status: "ready"; rows: { stop: Stop; meters: number }[] };

export function NearbyPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<NearbyState>({ status: "loading" });

  useEffect(() => {
    if (!open) return;
    setState({ status: "loading" });
    let cancelled = false;

    if (!navigator.geolocation) {
      setState({ status: "denied", message: "Location is not available on this device." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const stops = await allStops();
          if (cancelled) return;
          const rows = nearbyStops(stops, pos.coords.latitude, pos.coords.longitude, 12);
          setState({ status: "ready", rows });
        } catch {
          if (!cancelled) {
            setState({ status: "denied", message: "Could not load nearby stops." });
          }
        }
      },
      (err) => {
        if (cancelled) return;
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location permission is off. Enable it to find stops around you."
            : "Could not read your location. Try again from the pavement.";
        setState({ status: "denied", message });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-background/80" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-50 mx-auto flex h-dvh w-full max-w-lg flex-col bg-background px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-base font-medium">Nearby stops</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close nearby">
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {state.status === "loading" ? (
              <>
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </>
            ) : state.status === "denied" ? (
              <p className="px-1 text-sm text-muted">{state.message}</p>
            ) : state.rows.length === 0 ? (
              <p className="px-1 text-sm text-muted">No stops found nearby.</p>
            ) : (
              state.rows.map(({ stop, meters }) => (
                <StopRow
                  key={stop.code}
                  stop={stop}
                  meta={formatDistance(meters)}
                  onPick={() => onOpenChange(false)}
                />
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
