"use client";
import { useActionState, useState } from "react";
import { editItem, type EditState } from "../actions";
import { Icon } from "@/components/icons";

const STATES = [
  ["raw", "Raw"],
  ["cooked", "Cooked"],
  ["leftover", "Leftover"],
  ["frozen", "Frozen"],
  ["pantry", "Pantry"],
] as const;

export function EditForm(props: { id: string; name: string; quantity: string; state: string; useBy: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<EditState, FormData>(async (prev, fd) => {
    const r = await editItem(prev, fd);
    if (r.saved) setOpen(false);
    return r;
  }, {});

  if (!open) {
    return (
      <button type="button" className="btn flex-1" onClick={() => setOpen(true)}>
        <Icon name="pencil" size={18} />
        Edit
      </button>
    );
  }
  return (
    <form action={action} className="card fade-in flex w-full flex-col gap-3">
      <input type="hidden" name="id" value={props.id} />
      <label className="flex flex-col gap-1 text-[14px] font-semibold">
        Name
        <input name="name" defaultValue={props.name} className="field font-normal" maxLength={80} required />
      </label>
      <label className="flex flex-col gap-1 text-[14px] font-semibold">
        How much
        <input name="quantity" defaultValue={props.quantity} className="field font-normal" placeholder="e.g. x6, about 2 cups" maxLength={40} />
      </label>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-[14px] font-semibold">Kind</legend>
        <div className="flex flex-wrap gap-2">
          {STATES.map(([v, label]) => (
            <label key={v} className="chip !min-h-[40px] cursor-pointer !px-3.5 text-[14px]">
              <input type="radio" name="state" value={v} defaultChecked={props.state === v} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-[14px] font-semibold">
        Use-by date (from the package, if it has one)
        <input type="date" name="useBy" defaultValue={props.useBy} className="field font-normal" />
      </label>
      {state.error && (
        <p role="alert" className="text-[14px] font-semibold">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
