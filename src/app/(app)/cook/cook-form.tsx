"use client";
import { useActionState, useState } from "react";
import { findMeals, type CookState } from "./actions";
import { track } from "@/lib/events";
import { Icon } from "@/components/icons";

const TIMES = [15, 20, 30, 45] as const;

export function CookForm({
  minutes,
  forDay,
  allowReserved,
  profileLine,
}: {
  minutes: number;
  forDay: string;
  allowReserved: boolean;
  profileLine: React.ReactNode;
}) {
  const [state, action, pending] = useActionState<CookState, FormData>(findMeals, {});
  const [readyOnly, setReadyOnly] = useState(true);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        track("tap", "08", { target: "show_meals", minutes: Number(fd.get("minutes")), readyOnly, forDay: forDay || null });
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="forDay" value={forDay} />
      <input type="hidden" name="allowReserved" value={allowReserved ? "1" : ""} />
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-[16px] font-semibold">How much time do you have?</legend>
        <div className="grid grid-cols-4 gap-2">
          {TIMES.map((m) => (
            <label key={m} className="chip cursor-pointer !px-0">
              <input type="radio" name="minutes" value={m} defaultChecked={m === minutes} className="sr-only" />
              {m} min
            </label>
          ))}
        </div>
      </fieldset>

      <label className="card flex cursor-pointer items-center gap-3">
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[16px] font-semibold">Only food that is ready now</span>
          <span className="text-[14px] text-ink-2">Skips frozen and unchecked food.</span>
        </span>
        <input
          type="checkbox"
          name="readyOnly"
          role="switch"
          checked={readyOnly}
          onChange={(e) => setReadyOnly(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-line transition-colors peer-checked:bg-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink after:absolute after:top-[3px] after:left-[3px] after:size-[25px] after:rounded-full after:bg-paper after:shadow after:transition-transform peer-checked:after:translate-x-[20px]"
        />
      </label>

      <div className="note flex items-start gap-2 text-ink-2">
        <Icon name="info" size={20} className="mt-px shrink-0" />
        <span>{profileLine}</span>
      </div>

      {state.error && (
        <p role="alert" className="text-[15px] font-semibold">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Finding meals..." : "Show meals"}
      </button>
      {pending && <p className="text-center text-[14px] text-ink-2">Checking every idea against your profile.</p>}
    </form>
  );
}
