"use client";
import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { cookMeal } from "./actions";

export type DoneItem = { id: string; label: string; defaultChoice: "used" | "some"; note: string | null };

const CHOICES = [
  ["used", "Used up"],
  ["some", "Some left"],
  ["none", "Didn't use"],
] as const;

function DoneButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Saving..." : "Done"}
    </button>
  );
}

/** 11: was it cooked as suggested, and what was really used (update 2). */
export function DoneForm({
  refId,
  items,
  leftovers,
  back,
}: {
  refId: string;
  items: DoneItem[];
  leftovers: { text: string; useBy: string } | null;
  back: string;
}) {
  const [changed, setChanged] = useState(false);
  return (
    <form action={cookMeal} className="flex flex-1 flex-col gap-4">
      <input type="hidden" name="ref" value={refId} />
      <fieldset className="card flex flex-col gap-3">
        <legend className="sr-only">Did you cook it as suggested?</legend>
        <p className="text-[16px] font-semibold" aria-hidden>
          Did you cook it as suggested?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="chip cursor-pointer !px-2 text-[14px] whitespace-nowrap">
            <input type="radio" name="asSuggested" value="yes" defaultChecked className="sr-only" onChange={() => setChanged(false)} />
            Yes, as suggested
          </label>
          <label className="chip cursor-pointer !px-2 text-[14px] whitespace-nowrap">
            <input type="radio" name="asSuggested" value="changed" className="sr-only" onChange={() => setChanged(true)} />I changed it
          </label>
        </div>
        {changed && (
          <label className="fade-in flex flex-col gap-1 text-[14px] text-ink-2">
            What did you change? (optional)
            <input name="changes" className="field text-ink" placeholder="e.g. no pepper, added an onion" maxLength={300} />
          </label>
        )}
      </fieldset>

      {items.length > 0 && (
        <section className="card flex flex-col gap-3" aria-labelledby="used">
          <h2 id="used" className="text-[16px] font-semibold">
            I will update these in your fridge:
          </h2>
          <ul className="flex flex-col gap-4">
            {items.map((i) => (
              <li key={i.id} className="flex flex-col gap-2">
                <span className="text-[15px]">
                  {i.label}
                  {i.note && <span className="block text-[13px] text-ink-2">{i.note}</span>}
                </span>
                <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={`What happened to ${i.label}`}>
                  {CHOICES.map(([v, label]) => (
                    <label key={v} className="chip !min-h-[40px] cursor-pointer !px-1 text-[13px]">
                      <input type="radio" name={`use_${i.id}`} value={v} defaultChecked={v === i.defaultChoice} className="sr-only" />
                      {label}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {leftovers && (
        <label className="note flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="leftovers" defaultChecked className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]" />
          <span>
            Add {leftovers.text} to your fridge. Eat it by {leftovers.useBy}.
          </span>
        </label>
      )}

      <div className="action-bar mt-auto flex flex-col gap-2">
        <DoneButton />
        <Link href={back} className="btn w-full">
          Undo, I didn&apos;t cook it
        </Link>
      </div>
    </form>
  );
}
