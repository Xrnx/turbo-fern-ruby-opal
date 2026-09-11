import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Delete, LocateFixed, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function Keypad({
  code,
  onCodeChange,
  onNearby,
  onSearch,
}: {
  code: string;
  onCodeChange: (next: string) => void;
  onNearby: () => void;
  onSearch: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (code.length !== 5) return;
    const t = window.setTimeout(() => {
      void navigate({ to: "/stop/$code", params: { code } });
    }, 80);
    return () => window.clearTimeout(t);
  }, [code, navigate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        onCodeChange((code + e.key).slice(0, 5));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        onCodeChange(code.slice(0, -1));
      } else if (e.key === "Escape") {
        onCodeChange("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [code, onCodeChange]);

  function press(digit: string) {
    if (code.length >= 5) return;
    onCodeChange(code + digit);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center gap-2" aria-label="Stop code" aria-live="polite">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < code.length;
          const active = i === code.length && code.length < 5;
          return (
            <div
              key={i}
              className={cn(
                "flex h-16 w-12 items-center justify-center rounded-md border bg-card font-display text-4xl font-semibold tabular-nums",
                filled ? "border-primary/40 text-foreground" : "border-border text-subtle",
              )}
            >
              {filled ? (
                code[i]
              ) : active ? (
                <span className="halt-caret h-8 w-0.5 rounded-full bg-primary" />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <Button
            key={k}
            type="button"
            variant="key"
            size="key"
            onClick={() => press(k)}
            aria-label={`Digit ${k}`}
          >
            {k}
          </Button>
        ))}
        <Button
          type="button"
          variant="subtle"
          size="key"
          className="text-sm font-sans font-medium"
          onClick={onNearby}
        >
          <LocateFixed className="size-5" />
          Near
        </Button>
        <Button type="button" variant="key" size="key" onClick={() => press("0")} aria-label="Digit 0">
          0
        </Button>
        <Button
          type="button"
          variant="subtle"
          size="key"
          aria-label="Delete"
          onClick={() => onCodeChange(code.slice(0, -1))}
        >
          <Delete className="size-6" />
        </Button>
      </div>

      <Button type="button" variant="outline" className="h-12 rounded-lg" onClick={onSearch}>
        <Search className="size-4" />
        Search by name
      </Button>
    </div>
  );
}
