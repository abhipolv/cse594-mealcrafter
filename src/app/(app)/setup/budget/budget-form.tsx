"use client";
import { useActionState } from "react";
import { saveBudget, type SetupState } from "../actions";
import { ChoiceChip } from "../setup-parts";

const PERIODS = [
  ["meal", "Per meal"],
  ["week", "Per week"],
  ["two_weeks", "Per 2 weeks"],
] as const;
const TIMES = [15, 20, 30, 45] as const;
const GOALS = [
  ["use_soon", "Use food before it spoils"],
  ["protein", "More protein"],
  ["variety", "More variety"],
  ["fewer_pans", "Fewer pans"],
] as const;

export function BudgetForm(props: { period: string; amount: string; minutes: number; goals: string[]; fromProfile: boolean }) {
  const [state, action, pending] = useActionState<SetupState, FormData>(saveBudget, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {props.fromProfile && <input type="hidden" name="from" value="profile" />}
      <fieldset className="flex flex-col gap-2">
        <legend className="section-label mb-2">Budget</legend>
        <div className="grid grid-cols-3 gap-2">
          {PERIODS.map(([v, label]) => (
            <ChoiceChip key={v} type="radio" name="period" value={v} defaultChecked={props.period === v} compact>
              {label}
            </ChoiceChip>
          ))}
        </div>
        <label className="relative mt-1">
          <span className="sr-only">Amount in dollars</span>
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[17px] font-semibold">$</span>
          <input name="amount" inputMode="decimal" defaultValue={props.amount} placeholder="70" className="field !pl-8 font-semibold" required />
        </label>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="section-label mb-2">Weeknight cooking time</legend>
        <div className="grid grid-cols-4 gap-2">
          {TIMES.map((m) => (
            <ChoiceChip key={m} type="radio" name="minutes" value={String(m)} defaultChecked={props.minutes === m} compact>
              {m === 45 ? "45+" : m} min
            </ChoiceChip>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="section-label mb-2">Goals (flexible)</legend>
        <div className="flex flex-wrap gap-2">
          {GOALS.map(([v, label]) => (
            <ChoiceChip key={v} name="goal" value={v} defaultChecked={props.goals.includes(v)}>
              {label}
            </ChoiceChip>
          ))}
        </div>
        <p className="text-[13px] text-ink-2">Goals guide suggestions; your food rules are never bent.</p>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-[15px] font-semibold">
          {state.error}
        </p>
      )}
      <div className="action-bar mt-2">
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Saving..." : props.fromProfile ? "Save" : "Next"}
        </button>
      </div>
    </form>
  );
}
