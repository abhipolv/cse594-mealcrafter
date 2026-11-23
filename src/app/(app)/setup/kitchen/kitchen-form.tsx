"use client";
import { useActionState, useState } from "react";
import { saveKitchen, type SetupState } from "../actions";
import { ChoiceChip } from "../setup-parts";
import { Icon } from "@/components/icons";

function Stepper({ name, label, value, onChange, min = 1, max = 10 }: { name: string; label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="card fade-in flex items-center justify-between !py-2">
      <span className="text-[16px]">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-11 place-items-center rounded-full active:bg-fill disabled:opacity-30">
          <Icon name="minus" size={20} />
        </button>
        <span className="w-6 text-center text-[17px] font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-11 place-items-center rounded-full active:bg-fill disabled:opacity-30">
          <Icon name="plus" size={20} />
        </button>
      </div>
    </div>
  );
}

/** G05: who shares the fridge, who you cook for (update 8: with their agreement). */
export function KitchenForm(props: { shared: boolean | null; roommates: number; others: number; agreed: boolean; fromProfile: boolean }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(saveKitchen, {});
  const [shared, setShared] = useState<"just_me" | "others" | null>(props.shared === null ? null : props.shared ? "others" : "just_me");
  const [roommates, setRoommates] = useState(Math.max(1, props.roommates));
  const [cooks, setCooks] = useState<"just_me" | "others">(props.others > 0 ? "others" : "just_me");
  const [others, setOthers] = useState(Math.max(1, props.others));
  return (
    <form action={action} className="flex flex-col gap-4">
      {props.fromProfile && <input type="hidden" name="from" value="profile" />}
      <fieldset className="flex flex-col gap-2">
        <legend className="section-label mb-2">Who shares your fridge?</legend>
        <div className="flex gap-2">
          <ChoiceChip type="radio" name="shared" value="just_me" checked={shared === "just_me"} onChange={() => setShared("just_me")}>
            Just me
          </ChoiceChip>
          <ChoiceChip type="radio" name="shared" value="others" checked={shared === "others"} onChange={() => setShared("others")}>
            Others
          </ChoiceChip>
        </div>
        {shared === "others" && <Stepper name="roommates" label="Roommates" value={roommates} onChange={setRoommates} max={12} />}
        <p className="text-[14px] text-ink-2">
          {shared === "others" ? "I ask before analyzing any fridge photo, and never use what you mark \"not mine\"." : "Only your food is in the fridge."}
        </p>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="section-label mb-2">Who do you cook for?</legend>
        <div className="flex gap-2">
          <ChoiceChip type="radio" name="cooks" value="just_me" checked={cooks === "just_me"} onChange={() => setCooks("just_me")}>
            Just me
          </ChoiceChip>
          <ChoiceChip type="radio" name="cooks" value="others" checked={cooks === "others"} onChange={() => setCooks("others")}>
            Others too
          </ChoiceChip>
        </div>
        {cooks === "others" && (
          <>
            <Stepper name="others" label="Other people" value={others} onChange={setOthers} />
            <label className="note fade-in flex cursor-pointer items-start gap-3 !py-3">
              <input type="checkbox" name="agreed" defaultChecked={props.agreed} className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]" />
              <span className="text-[15px] leading-snug">
                They agreed that I plan meals for them. Add their allergies and rules to yours, so every meal fits everyone.
              </span>
            </label>
          </>
        )}
      </fieldset>
      {state.error && (
        <p role="alert" className="text-[15px] font-semibold">
          {state.error}
        </p>
      )}
      <div className="action-bar mt-2">
        <button type="submit" className="btn-primary w-full" disabled={pending || shared === null}>
          {pending ? "Saving..." : props.fromProfile ? "Save" : "Next"}
        </button>
      </div>
    </form>
  );
}
