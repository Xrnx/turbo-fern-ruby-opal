import { useEffect, useMemo, useState } from "react";
import { formatDistance, nearbyStops, useStopMap } from "@/lib/stops";
import { Overlay } from "@/components/ui/overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { StopRow } from "@/components/stop-row";

export function NearbyPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const stopMap = useStopMap();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCoords(null);
      setError(null);
      return;
    }
    if (!navigator.geolocation) {
      setError("Location is not available on this device.");
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        if (cancelled) return;
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is off. Enable it to find stops around you."
            : "Could not read your location. Try again from the pavement.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  const rows = useMemo(() => {
    if (!coords || stopMap.size === 0) return [];
    return nearbyStops(Array.from(stopMap.values()), coords.lat, coords.lng, 12);
  }, [coords, stopMap]);

  return (
    <Overlay open={open} onOpenChange={onOpenChange} title="Nearby stops" closeLabel="Close nearby">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {error ? (
          <p className="px-1 text-sm text-muted">{error}</p>
        ) : !coords || stopMap.size === 0 ? (
          <>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </>
        ) : rows.length === 0 ? (
          <p className="px-1 text-sm text-muted">No stops found nearby.</p>
        ) : (
          rows.map(({ stop, meters }) => (
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
