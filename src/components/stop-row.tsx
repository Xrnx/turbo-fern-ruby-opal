import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, MapPin } from "lucide-react";
import type { Stop } from "@/lib/stops";
import { cn } from "@/lib/utils";

export function StopRow({
  stop,
  meta,
  onPick,
}: {
  stop: Stop;
  meta?: string;
  onPick?: (code: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        onPick?.(stop.code);
        void navigate({ to: "/stop/$code", params: { code: stop.code } });
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg bg-card px-4 py-3.5 text-left",
        "transition-[background-color,transform] duration-150 ease-out",
        "hover:bg-card-2 active:scale-[0.99]",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-card-2 text-muted">
        <MapPin className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold tabular-nums tracking-wide">
            {stop.code}
          </span>
          {meta ? <span className="text-xs text-muted">{meta}</span> : null}
        </span>
        <span className="block truncate text-sm text-foreground">{stop.name}</span>
        <span className="block truncate text-xs text-muted">{stop.road}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-subtle" />
    </button>
  );
}
