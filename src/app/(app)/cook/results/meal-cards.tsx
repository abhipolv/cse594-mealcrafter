"use client";
import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/events";
import { Icon } from "@/components/icons";

export type MealCardData = {
  ref: string;
  title: string;
  facts: string;
  why: string | null;
  fits: string | null;
  usesSaved: string | null;
};

/** Meal cards on 09 with View recipe and Not tonight (hidden for this visit, logged). */
export function MealCards({
  meals,
  suggestionId,
  planDay,
  planAction,
}: {
  meals: MealCardData[];
  suggestionId: string;
  planDay: { iso: string; label: string } | null;
  planAction: (fd: FormData) => Promise<void>;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = meals.filter((m) => !hidden.includes(m.ref));
  return (
    <div className="flex flex-col gap-3">
      {visible.map((m) => (
        <article key={m.ref} className="card fade-in flex flex-col gap-2.5">
          <h2 className="text-[19px] leading-snug font-semibold">{m.title}</h2>
          <p className="flex items-center gap-1.5 text-[14px] text-ink-2">
            <Icon name="clock" size={16} />
            {m.facts}
          </p>
          {m.why && <p className="text-[15px] leading-snug">{m.why}</p>}
          {m.usesSaved && (
            <p className="flex items-start gap-2 rounded-[10px] border-[1.5px] border-dashed border-ink px-3 py-2 text-[14px]">
              <Icon name="info" size={18} className="mt-px shrink-0" />
              {m.usesSaved}
            </p>
          )}
          {m.fits && (
            <p className="flex items-center gap-2 rounded-[10px] bg-fill px-3 py-2 text-[14px] font-medium">
              <Icon name="check" size={18} className="shrink-0" />
              {m.fits}
            </p>
          )}
          <div className="mt-1 flex gap-2">
            {planDay ? (
              <form action={planAction} className="flex-1" onSubmit={() => track("tap", "09", { target: "plan_meal", title: m.title, day: planDay.iso })}>
                <input type="hidden" name="ref" value={m.ref} />
                <input type="hidden" name="day" value={planDay.iso} />
                <input type="hidden" name="swap" value="1" />
                <button className="btn-primary btn-sm w-full">Plan for {planDay.label}</button>
              </form>
            ) : null}
            <Link
              href={`/recipe/${m.ref}`}
              onClick={() => track("tap", "09", { target: "view_recipe", title: m.title, suggestionId })}
              className={`${planDay ? "btn" : "btn-primary"} btn-sm flex-1`}
            >
              View recipe
            </Link>
            {!planDay && (
              <button
                type="button"
                className="btn btn-sm flex-1"
                onClick={() => {
                  track("meal_dismissed", "09", { title: m.title, suggestionId });
                  setHidden((h) => [...h, m.ref]);
                }}
              >
                Not tonight
              </button>
            )}
          </div>
        </article>
      ))}
      {meals.length > 0 && visible.length === 0 && (
        <p className="note">You set all of these aside. Try a different time, or let me use food saved for planned meals.</p>
      )}
    </div>
  );
}
