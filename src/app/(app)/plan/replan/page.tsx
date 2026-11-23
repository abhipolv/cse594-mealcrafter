// 15 Replan proposal. Figma 4:349. Track D. Update 7. After a skip, offers
// what to do with the food saved for that meal; after cooking with saved food,
// offers how to revise the meal that needed it. Nothing changes until the
// user picks an option. No AI here: the options come from the plan and the
// use-by dates; new meal ideas go through suggestMeals() on 08/09.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getWeekView } from "@/lib/data/plan";
import { getItems } from "@/lib/data/items";
import { expiryOf } from "@/lib/items";
import { moveTarget } from "@/lib/plan-logic";
import { formatDay, relativeDay } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { TrackLink } from "@/components/track-link";
import { applyReplan } from "../actions";

function list(names: string[]) {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default async function ReplanPage({ searchParams }: PageProps<"/plan/replan">) {
  const user = await requireUser();
  const sp = await searchParams;
  const mealId = typeof sp.meal === "string" && /^[0-9a-f-]{36}$/.test(sp.meal) ? sp.meal : null;
  if (!mealId) notFound();
  const { meals, items, days, today } = await getWeekView(user.id);
  const [meal] = await db
    .select()
    .from(schema.plannedMeals)
    .where(and(eq(schema.plannedMeals.id, mealId), eq(schema.plannedMeals.userId, user.id)));
  if (!meal) notFound();
  const weekday = formatDay(meal.day, { weekday: "long" });
  const dish = meal.title.toLowerCase();
  const option = "card pressable flex w-full flex-col items-start gap-1 text-left";

  // After cooking: a planned meal lost food that was saved for it.
  const usedIds = typeof sp.used === "string" ? sp.used.split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x)) : [];
  if (usedIds.length && meal.status === "planned") {
    const lost = await db
      .select({ name: schema.items.name })
      .from(schema.items)
      .where(and(eq(schema.items.userId, user.id), inArray(schema.items.id, usedIds)));
    const names = list(lost.map((l) => l.name.toLowerCase()));
    return (
      <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-6">
        <ScreenView code="15" />
        <PageHeader title={`${weekday}'s ${dish} needs a change`} subtitle={`You cooked with the ${names} saved for it.`} />
        <TrackLink href={`/cook?for=${meal.day}`} screen="15" target="swap_after_cook" className={option}>
          <span className="text-[13px] font-semibold text-ink-2">Option A</span>
          <span className="text-[17px] font-semibold">Swap {weekday}&apos;s dinner</span>
          <span className="text-[14px] text-ink-2">Pick a new meal from what is left.</span>
        </TrackLink>
        <TrackLink href="/plan" screen="15" target="keep_buy_more" className={option}>
          <span className="text-[13px] font-semibold text-ink-2">Option B</span>
          <span className="text-[17px] font-semibold">Keep it, I will buy more {names}</span>
          <span className="text-[14px] text-ink-2">The plan stays as it is.</span>
        </TrackLink>
        <TrackLink href={`/plan/${meal.day}/skip`} screen="15" target="skip_after_cook" className={option}>
          <span className="text-[13px] font-semibold text-ink-2">Option C</span>
          <span className="text-[17px] font-semibold">Skip {weekday}&apos;s dinner</span>
        </TrackLink>
        <p className="text-[14px] text-ink-2">Nothing changes until you pick one.</p>
      </main>
    );
  }

  if (meal.status !== "skipped") redirect("/plan");
  const all = await getItems(user.id, ["reserved"]);
  const saved = all.filter((i) => i.reservedForMealId === meal.id).map((i) => ({ ...i, useByDay: expiryOf(i).day }));
  if (saved.length === 0) redirect("/plan");
  const reservedMealIds = new Set(items.filter((i) => i.status === "reserved" && i.reservedForMealId).map((i) => i.reservedForMealId!));
  reservedMealIds.delete(meal.id);
  const target = moveTarget(meal, days, meals, saved, reservedMealIds, today);
  const names = saved.map((s) => s.name.toLowerCase());
  const described = list(saved.map((s) => `${s.name.toLowerCase()}${s.useByDay ? ` (use by ${relativeDay(s.useByDay, today)})` : ""}`));
  const soonest = saved.filter((s) => s.useByDay).sort((a, b) => a.useByDay!.localeCompare(b.useByDay!))[0];
  const targetDay = target ? formatDay(target.day, { weekday: "long" }) : "";

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-6">
      <ScreenView code="15" />
      <PageHeader title={`${weekday} is skipped`} subtitle={`${described.charAt(0).toUpperCase()}${described.slice(1)} ${saved.length === 1 ? "was" : "were"} saved for ${weekday}'s ${dish}.`} />
      <form action={applyReplan} className="flex flex-col gap-3">
        <input type="hidden" name="meal" value={meal.id} />
        {target && (
          <>
            <input type="hidden" name="to" value={target.day} />
            <SubmitButton name="option" value="move" className={`${option} border-2 !p-[15px]`} pending="Moving...">
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink-2">Option A</span>
                {target.usesEverything && <span className="tag">Uses everything</span>}
              </span>
              <span className="text-[17px] font-semibold">
                Move the {dish} to {targetDay}
              </span>
              <span className="text-[14px] text-ink-2">
                {target.displaced
                  ? `${targetDay}'s dinner (${target.displaced.title.toLowerCase()}) moves to ${weekday}.`
                  : `${targetDay} is free.`}{" "}
                {soonest?.useByDay ? `The ${soonest.name.toLowerCase()} gets used by its date.` : ""}
              </span>
            </SubmitButton>
          </>
        )}
        <SubmitButton name="option" value="free" className={option} pending="Opening...">
          <span className="text-[13px] font-semibold text-ink-2">Option {target ? "B" : "A"}</span>
          <span className="text-[17px] font-semibold">Cook with the {list(names)} now</span>
          <span className="text-[14px] text-ink-2">They go back to your fridge list, and I show what you can make tonight.</span>
        </SubmitButton>
        <SubmitButton name="option" value="keep" className={option} pending="Saving...">
          <span className="text-[13px] font-semibold text-ink-2">Option {target ? "C" : "B"}</span>
          <span className="text-[17px] font-semibold">Keep the plan as it is</span>
          <span className="text-[14px] text-ink-2">
            {weekday} stays skipped. The {list(names)} {saved.length === 1 ? "goes" : "go"} back to your fridge list
            {soonest?.useByDay ? `; use the ${soonest.name.toLowerCase()} by ${relativeDay(soonest.useByDay, today)}` : ""}.
          </span>
        </SubmitButton>
      </form>
      <p className="text-[14px] text-ink-2">Nothing changes until you pick one.</p>
      <Link href="/plan" className="btn">
        Decide later
      </Link>
    </main>
  );
}
