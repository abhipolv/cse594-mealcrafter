"use client";
// Chips for G02 and G03: pick any number, or "None" on purpose. Choosing None
// clears the others and waits for Next instead of moving on (update 5, E2).
import { useActionState, useState, type ReactNode } from "react";
import type { SetupState } from "./actions";
import { ChoiceChip } from "./setup-parts";
import { Icon } from "@/components/icons";

export type Option = { value: string; label: string; hint?: string };
export type Group = { label: string; options: Option[] };

export function MultiChoice({
  action,
  groups,
  selected,
  other,
  none,
  noneLabel,
  submitLabel,
  fromProfile,
  footnote,
}: {
  action: (prev: SetupState, fd: FormData) => Promise<SetupState>;
  groups: Group[];
  selected: string[];
  other: string;
  none: boolean;
  noneLabel: string;
  submitLabel: string;
  fromProfile: boolean;
  footnote?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [picked, setPicked] = useState<string[]>(selected);
  const [otherOn, setOtherOn] = useState(other.length > 0);
  const [isNone, setNone] = useState(none && selected.length === 0 && !other);
  const answered = isNone || picked.length > 0 || otherOn;
  const hints = groups.flatMap((g) => g.options).filter((o) => o.hint && picked.includes(o.value));

  const toggle = (value: string, on: boolean) => {
    setNone(false);
    setPicked((p) => (on ? [...p, value] : p.filter((x) => x !== value)));
  };

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {fromProfile && <input type="hidden" name="from" value="profile" />}
      {groups.map((g) => (
        <fieldset key={g.label} className="flex flex-col gap-2">
          <legend className="section-label mb-2">{g.label}</legend>
          <div className="flex flex-wrap gap-2">
            {g.options.map((o) => (
              <ChoiceChip key={o.value} name="choice" value={o.value} checked={picked.includes(o.value)} onChange={(on) => toggle(o.value, on)}>
                {o.label}
              </ChoiceChip>
            ))}
            {g === groups[groups.length - 1] && (
              <ChoiceChip
                name="otherOn"
                value="on"
                checked={otherOn}
                onChange={(on) => {
                  setNone(false);
                  setOtherOn(on);
                }}
              >
                Other
              </ChoiceChip>
            )}
          </div>
        </fieldset>
      ))}
      {otherOn && (
        <label className="fade-in flex flex-col gap-1">
          <span className="text-[14px] font-semibold">What else? Separate with commas.</span>
          <input name="other" defaultValue={other} className="field" placeholder="e.g. mango, mushrooms" maxLength={300} autoFocus />
          <span className="text-[13px] text-ink-2">I leave out any meal that names these words.</span>
        </label>
      )}
      {hints.length > 0 && (
        <ul className="note flex flex-col gap-1 !py-3 text-[14px]">
          {hints.map((h) => (
            <li key={h.value} className="flex gap-2">
              <Icon name="info" size={18} className="mt-px shrink-0" />
              <span>
                <b>{h.label}:</b> {h.hint}
              </span>
            </li>
          ))}
        </ul>
      )}
      {footnote}
      <div>
        <ChoiceChip
          name="none"
          value="on"
          checked={isNone}
          onChange={(on) => {
            setNone(on);
            if (on) {
              setPicked([]);
              setOtherOn(false);
            }
          }}
        >
          {noneLabel}
        </ChoiceChip>
      </div>
      {state.error && (
        <p role="alert" className="text-[15px] font-semibold">
          {state.error}
        </p>
      )}
      <div className="action-bar mt-2">
        <button type="submit" className="btn-primary w-full" disabled={pending || !answered}>
          {pending ? "Saving..." : submitLabel}
        </button>
        {!answered && <p className="mt-2 text-center text-[13px] text-ink-2">Pick any that apply, or &quot;{noneLabel}&quot;.</p>}
      </div>
    </form>
  );
}
