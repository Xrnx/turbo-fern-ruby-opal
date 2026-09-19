import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rasterizeToImageData, readStopCode } from "@/lib/read-stop-code";
import { useStopMap } from "@/lib/stops";

type Status = "boot" | "need-permission" | "no-camera" | "scanning" | "photo-only";

export function CameraPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const stopMap = useStopMap();
  const knownRef = useRef(stopMap);
  knownRef.current = stopMap;
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastGuess = useRef<string | null>(null);
  const busy = useRef(false);
  const [status, setStatus] = useState<Status>("boot");
  const [hint, setHint] = useState("Point at the teal sign with the 5-digit code.");

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;
    lastGuess.current = null;
    busy.current = false;
    setStatus("boot");
    setHint("Point at the teal sign with the 5-digit code.");

    function accept(code: string) {
      onOpenChange(false);
      void navigate({ to: "/stop/$code", params: { code } });
    }

    function consider(code: string | null) {
      if (!code) {
        lastGuess.current = null;
        return;
      }
      if (knownRef.current.has(code) || lastGuess.current === code) {
        accept(code);
        return;
      }
      lastGuess.current = code;
      setHint(`Looking like ${code}… hold still`);
    }

    async function tick() {
      if (cancelled || busy.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const frame = rasterizeToImageData(video, video.videoWidth, video.videoHeight, 800);
      if (!frame) return;
      busy.current = true;
      try {
        consider(readStopCode(frame, knownRef.current));
      } catch {
        setHint("Couldn’t read that frame. Hold steady.");
      } finally {
        busy.current = false;
      }
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("photo-only");
        setHint("This browser won’t open a live camera. Take a photo of the teal 5-digit code.");
        return;
      }
      try {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          await video.play().catch(() => undefined);
        }
        setStatus("scanning");
        setHint("Point at the teal sign with the 5-digit code.");
        timer = window.setInterval(() => void tick(), 550);
      } catch (err) {
        const denied =
          err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
        setStatus(denied ? "need-permission" : "no-camera");
        setHint(
          denied
            ? "Camera permission is off. Enable it, or take a photo instead."
            : "Could not start the camera. Take a photo of the code instead.",
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [open, navigate, onOpenChange]);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setHint("Reading photo…");
    try {
      let bitmap: ImageBitmap | null = null;
      if (typeof createImageBitmap === "function") {
        bitmap = await createImageBitmap(file);
      }
      let pixels;
      if (bitmap) {
        pixels = rasterizeToImageData(bitmap, bitmap.width, bitmap.height, 960);
        bitmap.close();
      } else {
        const url = URL.createObjectURL(file);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("Could not open photo"));
          el.src = url;
        });
        pixels = rasterizeToImageData(img, img.naturalWidth, img.naturalHeight, 960);
        URL.revokeObjectURL(url);
      }
      if (!pixels) {
        setHint("Couldn’t open that photo. Try another.");
        return;
      }
      const code = readStopCode(pixels, knownRef.current);
      if (!code) {
        setHint("No stop code in that photo. Fill the frame with the teal 5-digit band.");
        return;
      }
      onOpenChange(false);
      void navigate({ to: "/stop/$code", params: { code } });
    } catch {
      setHint("Couldn’t read that photo. Try again with the teal code filling the frame.");
    }
  }

  if (!open || typeof document === "undefined") return null;

  const live = status === "scanning" || status === "boot";

  return createPortal(
    <div className="fixed inset-0 z-50 bg-background" role="dialog" aria-modal="true" aria-labelledby="scan-title">
      <div className="relative mx-auto flex h-dvh w-full max-w-lg flex-col">
        <video
          ref={videoRef}
          className="absolute inset-0 size-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {!live ? <div className="absolute inset-0 bg-card" /> : null}

        <div className="pointer-events-none absolute inset-0 flex flex-col">
          <div className="flex-[2] bg-background/70" />
          <div className="flex h-40">
            <div className="w-6 bg-background/70" />
            <div className="flex-1 rounded-lg border-2 border-primary" />
            <div className="w-6 bg-background/70" />
          </div>
          <div className="flex-[3] bg-background/70" />
        </div>

        <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <h2 id="scan-title" className="text-base font-medium">
            Scan pole
          </h2>
          <Button variant="ghost" size="icon" aria-label="Close camera" onClick={() => onOpenChange(false)}>
            <X />
          </Button>
        </div>

        <p className="relative z-10 mt-auto px-5 pb-3 text-center text-sm text-pretty text-foreground" aria-live="polite">
          {hint}
        </p>

        <div className="relative z-10 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void onPhoto(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-lg bg-background/80"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="size-4" />
            Take a photo instead
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
