import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pickStopCode } from "@/lib/ocr-code";
import { useStopMap } from "@/lib/stops";

type Status =
  | "boot"
  | "need-permission"
  | "no-camera"
  | "loading-reader"
  | "scanning"
  | "photo-only";

let workerPromise: Promise<{
  recognize: (image: HTMLCanvasElement | HTMLImageElement) => Promise<{ data: { text: string } }>;
}> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const load = Function(
        "u",
        "return import(u)",
      ) as (url: string) => Promise<{
        createWorker: (
          lang: string,
          oem?: number,
        ) => Promise<{
          recognize: (image: HTMLCanvasElement | HTMLImageElement) => Promise<{ data: { text: string } }>;
          setParameters: (p: Record<string, unknown>) => Promise<void>;
        }>;
        PSM: { SINGLE_LINE: string };
      }>;
      const { createWorker, PSM } = await load("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm");
      const worker = await createWorker("eng", 1);
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789",
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

function grabFrame(video: HTMLVideoElement) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const cropW = vw * 0.78;
  const cropH = Math.min(vh * 0.22, cropW * 0.38);
  const canvas = document.createElement("canvas");
  canvas.width = 520;
  canvas.height = Math.max(80, Math.round(520 * (cropH / cropW)));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(
    video,
    (vw - cropW) / 2,
    (vh - cropH) / 2,
    cropW,
    cropH,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas;
}

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
  const [hint, setHint] = useState("Point at the 5-digit code on the pole.");

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;
    lastGuess.current = null;
    busy.current = false;
    setStatus("boot");
    setHint("Point at the 5-digit code on the pole.");

    async function readCanvas(canvas: HTMLCanvasElement) {
      const worker = await getWorker();
      if (cancelled) return;
      const { data } = await worker.recognize(canvas);
      if (cancelled) return;
      const code = pickStopCode(data.text, knownRef.current);
      if (!code) {
        lastGuess.current = null;
        return;
      }
      if (knownRef.current.has(code) || lastGuess.current === code) {
        onOpenChange(false);
        void navigate({ to: "/stop/$code", params: { code } });
        return;
      }
      lastGuess.current = code;
      setHint(`Looking like ${code}… hold still`);
    }

    async function tick() {
      if (cancelled || busy.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const canvas = grabFrame(video);
      if (!canvas) return;
      busy.current = true;
      try {
        await readCanvas(canvas);
      } catch {
        setHint("Couldn’t read that frame. Hold steady.");
      } finally {
        busy.current = false;
      }
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("photo-only");
        setHint("This browser won’t open a live camera. Take a photo of the code.");
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
        setStatus("loading-reader");
        setHint("Starting reader…");
        await getWorker();
        if (cancelled) return;
        setStatus("scanning");
        setHint("Point at the 5-digit code on the pole.");
        timer = window.setInterval(() => void tick(), 700);
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
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not open photo"));
        el.src = url;
      });
      const worker = await getWorker();
      const { data } = await worker.recognize(img);
      URL.revokeObjectURL(url);
      const code = pickStopCode(data.text, knownRef.current);
      if (!code) {
        setHint("No 5-digit code in that photo. Try closer, fill the frame.");
        return;
      }
      onOpenChange(false);
      void navigate({ to: "/stop/$code", params: { code } });
    } catch {
      setHint("Couldn’t read that photo. Try again with the code filling the frame.");
    }
  }

  if (!open || typeof document === "undefined") return null;

  const live = status === "scanning" || status === "loading-reader" || status === "boot";

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
          <div className="flex-1 bg-background/70" />
          <div className="flex h-28">
            <div className="w-8 bg-background/70" />
            <div className="flex-1 rounded-lg border-2 border-primary" />
            <div className="w-8 bg-background/70" />
          </div>
          <div className="flex-1 bg-background/70" />
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
