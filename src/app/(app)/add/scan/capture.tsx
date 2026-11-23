"use client";
// G09 capture. Frames are taken from the live camera (or a chosen file) and
// resized on the phone to at most 1024 px before upload, so a whole fridge
// video is a dozen small JPEGs. The recognizer runs on the server (rule 7).
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/events";
import { Icon } from "@/components/icons";

type Mode = "video" | "photo" | "receipt";
type Frame = { blob: Blob; w: number; h: number; url: string };
type Phase = "starting" | "live" | "recording" | "fallback" | "uploading" | "recognizing" | "error";

const MAX_SIDE = 1024;
const QUALITY = 0.75;
const FRAME_EVERY_MS = 1500;
const MAX_FRAMES = 12;
const MAX_SECONDS = 20;
const MAX_SHOTS = { video: MAX_FRAMES, photo: 3, receipt: 2 } as const;
const AREAS = ["Shelves", "Door", "Drawers"] as const;

async function toJpeg(source: CanvasImageSource, sw: number, sh: number): Promise<Frame> {
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(source, 0, 0, w, h);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read the camera image"))), "image/jpeg", QUALITY),
  );
  return { blob, w, h, url: URL.createObjectURL(blob) };
}

async function framesFromVideoFile(file: File): Promise<Frame[]> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  await new Promise<void>((resolve, reject) => {
    v.onloadeddata = () => resolve();
    v.onerror = () => reject(new Error("That video could not be opened."));
  });
  const n = Math.min(10, Math.max(1, Math.floor(v.duration / 1.5)));
  const out: Frame[] = [];
  for (let i = 0; i < n; i++) {
    v.currentTime = Math.min(v.duration - 0.05, ((i + 0.5) * v.duration) / n);
    await new Promise<void>((resolve) => (v.onseeked = () => resolve()));
    out.push(await toJpeg(v, v.videoWidth, v.videoHeight));
  }
  URL.revokeObjectURL(url);
  return out;
}

async function framesFromImages(files: File[]): Promise<Frame[]> {
  const out: Frame[] = [];
  for (const f of files) {
    const bmp = await createImageBitmap(f);
    out.push(await toJpeg(bmp, bmp.width, bmp.height));
    bmp.close();
  }
  return out;
}

export function Capture({ mode }: { mode: Mode }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const framesRef = useRef<Frame[]>([]);
  const startedRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("starting");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [areas, setAreas] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase("fallback");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setPhase("live");
      } catch {
        if (!cancelled) setPhase("fallback");
      }
    })();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera]);

  const upload = useCallback(
    (list: Frame[]) => {
      if (list.length === 0) return;
      stopCamera();
      setPhase("uploading");
      setProgress(0);
      setError(null);
      const body = new FormData();
      body.set("meta", JSON.stringify({ source: mode, dims: list.map((f) => ({ w: f.w, h: f.h })) }));
      list.forEach((f, i) => body.append("frames", f.blob, `frame-${i}.jpg`));
      const sent = Date.now();
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/scans");
      xhr.responseType = "json";
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(e.loaded / e.total);
      xhr.upload.onload = () => setPhase("recognizing");
      xhr.onload = () => {
        const res = (xhr.response ?? {}) as { scanId?: string; error?: string };
        if (xhr.status === 200 && res.scanId) {
          track("scan", "G09", { phase: "uploaded", source: mode, frames: list.length, ms: Date.now() - sent });
          router.push(`/add/results?scan=${res.scanId}`);
        } else {
          setError(res.error ?? "Something went wrong. Try again.");
          setPhase("error");
        }
      };
      xhr.onerror = () => {
        setError("No connection. Check your internet and try again.");
        setPhase("error");
      };
      xhr.send(body);
    },
    [mode, router, stopCamera],
  );

  const grab = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const f = await toJpeg(v, v.videoWidth, v.videoHeight);
    framesRef.current = [...framesRef.current, f];
    setFrames(framesRef.current);
    return framesRef.current.length;
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    upload(framesRef.current);
  }, [upload]);

  async function startRecording() {
    track("scan", "G09", { phase: "start", source: mode });
    framesRef.current = [];
    setFrames([]);
    setPhase("recording");
    startedRef.current = Date.now();
    await grab();
    timerRef.current = window.setInterval(async () => {
      const elapsed = (Date.now() - startedRef.current) / 1000;
      setSeconds(Math.floor(elapsed));
      const n = await grab();
      if ((n ?? 0) >= MAX_FRAMES || elapsed >= MAX_SECONDS) stopRecording();
    }, FRAME_EVERY_MS);
  }

  async function shoot() {
    if (framesRef.current.length === 0) track("scan", "G09", { phase: "start", source: mode });
    if (framesRef.current.length >= MAX_SHOTS[mode]) return;
    await grab();
  }

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    track("scan", "G09", { phase: "start", source: mode, fromFile: true });
    try {
      setPhase("uploading");
      const files = [...list];
      const made = files[0].type.startsWith("video/")
        ? await framesFromVideoFile(files[0])
        : await framesFromImages(files.slice(0, MAX_SHOTS[mode]));
      framesRef.current = made;
      setFrames(made);
      upload(made);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That file could not be read.");
      setPhase("error");
    }
  }

  const busy = phase === "uploading" || phase === "recognizing";
  const pendingArea = AREAS.find((a) => !areas.includes(a));
  const hint =
    mode === "video"
      ? phase === "recording"
        ? pendingArea
          ? pendingArea === "Drawers"
            ? "Open the drawers"
            : `Now the ${pendingArea.toLowerCase()}`
          : "Got it. Tap stop when done"
        : "Slowly: shelves, door, drawers"
      : mode === "receipt"
        ? "Fit the whole receipt in view"
        : "Open the door wide, step back";

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col bg-ink text-paper">
      {/* Live camera fills the screen behind the controls. */}
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label="Camera view"
        className={`absolute inset-0 h-full w-full object-cover ${phase === "live" || phase === "recording" ? "" : "invisible"}`}
      />

      <div className="relative z-10 flex items-center gap-2 px-4 pt-3">
        <Link href="/add" aria-label="Cancel and go back" className="grid size-11 place-items-center rounded-full bg-ink/70 active:bg-ink">
          <Icon name="x" size={22} />
        </Link>
        {phase === "recording" ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-ink/85 px-3 py-1.5 text-[14px] font-semibold tabular-nums">
            <span className="size-2 animate-pulse rounded-full bg-paper" aria-hidden /> REC 0:{String(seconds).padStart(2, "0")}
          </span>
        ) : null}
        {(phase === "live" || phase === "recording") && (
          <span className="rounded-full bg-paper px-3 py-1.5 text-[14px] font-semibold text-ink" aria-live="polite">
            {hint}
          </span>
        )}
      </div>

      <div className="relative z-10 mt-auto flex flex-col items-center gap-4 bg-gradient-to-t from-ink via-ink/80 to-transparent px-5 pt-10 pb-[calc(24px+env(safe-area-inset-bottom))]">
        {(phase === "live" || phase === "recording") && mode === "video" && (
          <div className="flex gap-2" role="group" aria-label="Areas covered">
            {AREAS.map((a) => {
              const on = areas.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAreas((s) => (on ? s.filter((x) => x !== a) : [...s, a]))}
                  className={`inline-flex min-h-[40px] items-center gap-1 rounded-full px-3.5 text-[14px] font-semibold ${on ? "bg-paper text-ink" : "border-[1.5px] border-dashed border-paper text-paper"}`}
                >
                  {on && <Icon name="check" size={16} />}
                  {a}
                </button>
              );
            })}
          </div>
        )}

        {(phase === "live" || phase === "recording") && mode !== "video" && frames.length > 0 && (
          <div className="flex items-center gap-2">
            {frames.map((f, i) => (
              <span
                key={f.url}
                role="img"
                aria-label={`Photo ${i + 1}`}
                className="size-14 rounded-lg border-2 border-paper bg-cover bg-center"
                style={{ backgroundImage: `url(${f.url})` }}
              />
            ))}
          </div>
        )}

        {phase === "live" && mode === "video" && (
          <button type="button" onClick={startRecording} aria-label="Start recording" className="grid size-[76px] place-items-center rounded-full border-4 border-paper active:scale-95">
            <span className="size-[58px] rounded-full bg-paper" />
          </button>
        )}
        {phase === "recording" && (
          <button type="button" onClick={stopRecording} aria-label="Stop and find food" className="grid size-[76px] place-items-center rounded-full bg-paper active:scale-95">
            <span className="size-7 rounded-[6px] bg-ink" />
          </button>
        )}
        {phase === "live" && mode !== "video" && (
          <div className="flex w-full items-center justify-center gap-6">
            <span className="w-24" />
            <button
              type="button"
              onClick={shoot}
              disabled={frames.length >= MAX_SHOTS[mode]}
              aria-label="Take photo"
              className="grid size-[76px] place-items-center rounded-full border-4 border-paper active:scale-95 disabled:opacity-40"
            >
              <span className="size-[58px] rounded-full bg-paper" />
            </button>
            <button
              type="button"
              disabled={frames.length === 0}
              onClick={() => upload(framesRef.current)}
              className="h-11 w-24 rounded-full bg-paper text-[15px] font-semibold text-ink disabled:opacity-0"
            >
              Use {frames.length || ""}
            </button>
          </div>
        )}
        {phase === "recording" && <p className="text-[13px] text-paper/80">{frames.length} frames. Stops by itself at {MAX_SECONDS} s.</p>}
      </div>

      {(phase === "starting" || phase === "fallback" || busy || phase === "error") && (
        <div className="absolute inset-0 z-20 flex flex-col justify-center gap-5 bg-ink px-6" aria-live="polite">
          {phase === "starting" && <p className="text-center text-[16px]">Opening the camera...</p>}

          {phase === "fallback" && (
            <>
              <h1 className="text-[24px] font-bold">
                {mode === "video" ? "Record your fridge" : mode === "receipt" ? "Photograph your receipt" : "Photograph your fridge"}
              </h1>
              <p className="text-[15px] text-paper/80">
                The live camera is not available here. Your phone&apos;s camera opens instead; come back to this page when you are done.
              </p>
              <label className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-paper text-[16px] font-semibold text-ink active:opacity-85">
                <Icon name={mode === "video" ? "video" : "camera"} size={20} />
                {mode === "video" ? "Record a video" : "Take a photo"}
                <input
                  type="file"
                  className="sr-only"
                  accept={mode === "video" ? "video/*" : "image/*"}
                  capture="environment"
                  onChange={(e) => onFiles(e.target.files)}
                />
              </label>
              <label className="flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-paper text-[16px] font-semibold active:bg-paper/10">
                Choose from your library
                <input
                  type="file"
                  className="sr-only"
                  accept={mode === "video" ? "video/*,image/*" : "image/*"}
                  multiple={mode !== "video"}
                  onChange={(e) => onFiles(e.target.files)}
                />
              </label>
            </>
          )}

          {busy && (
            <div className="flex flex-col gap-4">
              <p className="text-[20px] font-bold">{phase === "uploading" ? "Sending your photos" : "Finding your food"}</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-paper/20" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`h-full rounded-full bg-maize transition-[width] duration-300 ${phase === "recognizing" ? "w-full animate-pulse" : ""}`}
                  style={phase === "uploading" ? { width: `${Math.max(4, progress * 100)}%` } : undefined}
                />
              </div>
              <p className="text-[15px] text-paper/80">
                {phase === "uploading"
                  ? `${frames.length} ${frames.length === 1 ? "image" : "images"}, made small on your phone first.`
                  : "Reading labels and shelves. This can take up to a minute."}
              </p>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col gap-4">
              <p className="text-[20px] font-bold">That didn&apos;t work</p>
              <p role="alert" className="text-[15px] text-paper/85">
                {error}
              </p>
              {frames.length > 0 && (
                <button type="button" onClick={() => upload(framesRef.current)} className="min-h-[52px] rounded-xl bg-paper text-[16px] font-semibold text-ink">
                  Try again
                </button>
              )}
              <button type="button" onClick={() => window.location.reload()} className="min-h-[52px] rounded-xl border-[1.5px] border-paper text-[16px] font-semibold">
                Start over
              </button>
              <Link href="/add/scan?mode=typed" className="flex min-h-[44px] items-center justify-center text-[15px] font-semibold underline">
                Type it in instead
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
