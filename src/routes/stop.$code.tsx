import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, RefreshCw, Star } from "lucide-react";
import { ArrivalList } from "@/components/arrival-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ARRIVAL_REFRESH_MS, getArrivals } from "@/lib/arrivals";
import { useSavedStops } from "@/lib/saved-stops";
import { useStopMap } from "@/lib/stops";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stop/$code")({
  component: StopPage,
});

function StopPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const valid = /^\d{5}$/.test(code);
  const addRecent = useSavedStops((s) => s.addRecent);
  const toggleSaved = useSavedStops((s) => s.toggleSaved);
  const saved = useSavedStops((s) => s.saved.includes(code));
  const stopMap = useStopMap();
  const stop = stopMap.get(code);

  useEffect(() => {
    if (!valid) {
      void navigate({ to: "/" });
      return;
    }
    addRecent(code);
  }, [code, valid, addRecent, navigate]);

  const arrivals = useQuery({
    queryKey: ["arrivals", code],
    queryFn: () => getArrivals({ data: { code } }),
    enabled: valid,
    refetchInterval: ARRIVAL_REFRESH_MS,
  });

  if (!valid) return null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-12 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-start gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link to="/">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 pt-1.5">
          <p className="font-display text-lg font-semibold tabular-nums tracking-wide text-muted">
            {code}
          </p>
          <h1 className="truncate text-xl font-medium leading-tight">
            {stop?.name ?? "Bus stop"}
          </h1>
          <p className="truncate text-sm text-muted">{stop?.road ?? "Singapore"}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={saved ? "Remove saved stop" : "Save stop"}
          aria-pressed={saved}
          onClick={() => toggleSaved(code)}
        >
          <Star
            className={cn("size-5", saved ? "fill-primary text-primary" : "text-muted")}
            strokeWidth={1.75}
          />
        </Button>
      </header>

      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className={cn("size-1.5 rounded-full", arrivals.isFetching ? "bg-ok" : "bg-muted")} />
          {arrivals.isError ? "Could not refresh" : "Live · every 15s"}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-foreground"
          onClick={() => void arrivals.refetch()}
        >
          <RefreshCw className={cn("size-3.5", arrivals.isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {arrivals.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : arrivals.isError ? (
        <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
          <p className="text-base font-medium">Arrivals unavailable</p>
          <p className="mt-2 text-sm text-muted">
            {arrivals.error instanceof Error
              ? arrivals.error.message
              : "Try again in a moment."}
          </p>
          <Button className="mt-5" onClick={() => void arrivals.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <ArrivalList services={arrivals.data?.services ?? []} stopMap={stopMap} />
      )}
    </main>
  );
}
