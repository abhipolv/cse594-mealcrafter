"use client";
import { useActionState } from "react";
import { addTyped, type TypedState } from "./actions";

const PLACES = [
  ["raw", "Fridge"],
  ["frozen", "Freezer"],
  ["pantry", "Pantry"],
] as const;

export function TypedForm() {
  const [state, action, pending] = useActionState<TypedState, FormData>(addTyped, {});
  return (
    <form action={action} className="flex flex-1 flex-col gap-4">
      <label htmlFor="text" className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold">One food per line</span>
        <span className="text-[14px] text-ink-2">Add an amount if you like: &quot;eggs x12&quot;, &quot;2 cups rice&quot;.</span>
      </label>
      <textarea
        id="text"
        name="text"
        rows={7}
        required
        maxLength={4000}
        placeholder={"eggs x12\nspinach\n2 cups cooked rice"}
        className="field min-h-[180px] py-3 leading-relaxed"
        autoCapitalize="sentences"
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="section-label mb-2">Where is it?</legend>
        <div className="flex flex-wrap gap-2">
          {PLACES.map(([v, label]) => (
            <label key={v} className="chip cursor-pointer">
              <input type="radio" name="place" value={v} defaultChecked={v === "raw"} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-[15px] font-semibold">
          {state.error}
        </p>
      )}
      <div className="action-bar mt-auto">
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Adding..." : "Add to my fridge"}
        </button>
      </div>
    </form>
  );
}
