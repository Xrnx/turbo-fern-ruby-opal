import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Overlay({
  open,
  onOpenChange,
  title,
  closeLabel,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-background" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
      <div className="mx-auto flex h-dvh w-full max-w-lg flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="overlay-title" className="text-base font-medium">
            {title}
          </h2>
          <Button variant="ghost" size="icon" aria-label={closeLabel} onClick={() => onOpenChange(false)}>
            <X />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
