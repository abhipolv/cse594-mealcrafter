"use client";
import { useState } from "react";

export type FrameBox = { label: string; check: boolean; box: { x: number; y: number; w: number; h: number } };
export type FrameData = { id: string; w: number; h: number; boxes: FrameBox[] };

/** G10: the scanned frames with a box for every item found. Solid = added, dashed = needs your check. */
export function FrameViewer({ frames }: { frames: FrameData[] }) {
  const start = Math.max(0, frames.reduce((best, f, i) => (f.boxes.length > frames[best].boxes.length ? i : best), 0));
  const [current, setCurrent] = useState(start);
  const f = frames[current];
  return (
    <div className="flex flex-col gap-3">
      {frames.length > 1 && (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="tablist" aria-label="Frames">
          {frames.map((fr, i) => (
            <button
              key={fr.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Frame ${i + 1}, ${fr.boxes.length} items`}
              onClick={() => setCurrent(i)}
              className={`relative h-[68px] w-[60px] shrink-0 rounded-lg bg-line bg-cover bg-center ${i === current ? "ring-2 ring-ink ring-offset-2" : "opacity-80"}`}
              style={{ backgroundImage: `url(/api/media/${fr.id})` }}
            >
              {fr.boxes.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-paper">
                  {fr.boxes.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <div
        className="relative w-full overflow-hidden rounded-xl bg-line bg-cover"
        style={{ aspectRatio: `${f.w} / ${f.h}`, backgroundImage: `url(/api/media/${f.id})` }}
        role="img"
        aria-label={`Frame ${current + 1}: ${f.boxes.map((b) => b.label).join(", ") || "no items marked"}`}
      >
        {f.boxes.map((b, i) => (
          <div
            key={i}
            className={`absolute rounded-[4px] border-2 ${b.check ? "border-dashed border-paper" : "border-paper"} shadow-[0_0_0_1.5px_rgb(19_21_22/0.75)]`}
            style={{ left: `${b.box.x * 100}%`, top: `${b.box.y * 100}%`, width: `${b.box.w * 100}%`, height: `${b.box.h * 100}%` }}
          >
            <span
              className={`absolute max-w-[160px] truncate rounded-[4px] px-1.5 py-0.5 text-[11px] font-semibold ${b.check ? "bg-maize text-ink" : "bg-ink text-paper"} ${b.box.y < 0.08 ? "top-0" : "-top-[22px]"} ${b.box.x + b.box.w > 0.7 ? "right-[-2px]" : "left-[-2px]"}`}
            >
              {b.check ? `${b.label}?` : b.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
