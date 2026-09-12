import { useEffect, useState } from "react";
import { allStops, formatDistance, nearbyStops, type Stop } from "@/lib/stops";
import { Overlay } from "@/components/ui/overlay";
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
    <Overlay open={open} onOpenChange={onOpenChange} title="Nearby stops" closeLabel="Close nearby">
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
    </Overlay>
  );
}
