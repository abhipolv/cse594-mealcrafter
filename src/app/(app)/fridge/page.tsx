// G12 Your fridge. Figma 98:1145 (same as 06, 3:240). Track C. Update 3: use-by
// on every item, sorted by it, today's date and time since the last scan, a
// rescan nudge when the list is old. Update 4: unchecked items stay apart.
import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getItems, lastUpdate } from "@/lib/data/items";
import { getProfile, ruleContext } from "@/lib/data/profile";
import { groupFridge, itemTitle } from "@/lib/items";
import { dayOf, daysBetween, formatDay, relativeDay, today as todayIso } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { ItemRow } from "@/components/item-row";
import { Icon } from "@/components/icons";

const STALE_DAYS = 4;

function ago(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export default async function FridgePage() {
  const user = await requireUser();
  const today = todayIso();
  const [items, profile, updated] = await Promise.all([
    getItems(user.id, ["ready", "needs_check", "reserved", "unclear", "not_mine"]),
    getProfile(user.id),
    lastUpdate(user.id),
  ]);
  const s = groupFridge(items, ruleContext(profile));

  const mealIds = [...new Set(s.reserved.map((i) => i.reservedForMealId).filter((x): x is string => !!x))];
  const meals = mealIds.length
    ? await db
        .select({ id: schema.plannedMeals.id, day: schema.plannedMeals.day, title: schema.plannedMeals.title })
        .from(schema.plannedMeals)
        .where(and(eq(schema.plannedMeals.userId, user.id), inArray(schema.plannedMeals.id, mealIds)))
    : [];
  const mealById = new Map(meals.map((m) => [m.id, m]));

  const age = updated ? daysBetween(dayOf(updated.at), today) : null;
  const stale = age !== null && age >= STALE_DAYS;
  const empty = items.length === 0;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-6">
      <ScreenView code="G12" />
      <PageHeader
        title="Your fridge"
        subtitle={
          <>
            {formatDay(today, { weekday: "long", month: "short", day: "numeric" })}.{" "}
            {updated ? `Last updated ${ago(age ?? 0)}.` : "Nothing added yet."}
          </>
        }
      />

      <Link href="/add" className="btn self-start !min-h-[44px] text-[15px]">
        <Icon name="plus" size={18} />
        Add food
      </Link>

      {stale && (
        <Link href="/add" className="card-check pressable flex items-start gap-3">
          <Icon name="clock" size={22} className="mt-0.5 shrink-0" />
          <span className="flex flex-col gap-1">
            <span className="text-[16px] font-semibold">This list is {age} days old</span>
            <span className="text-[14px] text-ink-2">Food may have been eaten or added since. A quick video keeps meals accurate.</span>
            <span className="text-[15px] font-semibold">Scan again &gt;</span>
          </span>
        </Link>
      )}

      {s.toCheck.length > 0 && (
        <Link href="/check?from=/fridge" className="card-check pressable flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="chip-maize !px-2.5 !text-[14px] tabular-nums">{s.toCheck.length}</span>
            <span className="flex-1 text-[16px] font-semibold">to check</span>
            <span className="font-semibold">Check &gt;</span>
          </span>
          <span className="text-[14px] text-ink-2">Kept out of your meals until you check them.</span>
        </Link>
      )}

      {empty && (
        <div className="note flex flex-col gap-3">
          <p>Nothing here yet. Add food from a fridge video, a photo, a receipt or by typing it in.</p>
          <Link href="/add" className="btn-primary">
            Add food
          </Link>
        </div>
      )}

      {s.ready.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="ready">
          <h2 id="ready" className="section-label">
            Ready to cook, use soonest first
          </h2>
          <ul className="flex flex-col gap-2">
            {s.ready.map((i) => (
              <ItemRow key={i.id} item={i} today={today} />
            ))}
          </ul>
        </section>
      )}

      {s.reserved.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="saved">
          <h2 id="saved" className="section-label">
            Saved for planned meals
          </h2>
          <ul className="flex flex-col gap-2">
            {s.reserved.map((i) => {
              const m = i.reservedForMealId ? mealById.get(i.reservedForMealId) : undefined;
              return (
                <ItemRow
                  key={i.id}
                  item={i}
                  today={today}
                  detail={m ? `For ${relativeDay(m.day, today)}: ${m.title}` : "Saved for a planned meal"}
                />
              );
            })}
          </ul>
        </section>
      )}

      {s.keptOut.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="kept">
          <h2 id="kept" className="section-label">
            Kept out of your meals
          </h2>
          <ul className="flex flex-col gap-2">
            {s.keptOut.map(({ item, reason }) => (
              <ItemRow key={item.id} item={item} today={today} detail={reason} />
            ))}
          </ul>
        </section>
      )}

      {s.unclear.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="unclear">
          <h2 id="unclear" className="section-label">
            Not added: couldn&apos;t see clearly
          </h2>
          <ul className="flex flex-col gap-2">
            {s.unclear.map((i) => (
              <ItemRow key={i.id} item={i} today={today} muted detail={i.evidence.where ?? "Not in your meals"} right={<span />} />
            ))}
          </ul>
        </section>
      )}

      {updated && (updated.source === "video" || updated.source === "photo") && (
        <section className="flex flex-col gap-2" aria-labelledby="unseen">
          <h2 id="unseen" className="section-label">
            Not seen
          </h2>
          <Link href="/add" className="card pressable flex items-center gap-3 border-line">
            <span className="flex flex-1 flex-col">
              <span className="text-[16px] font-semibold text-ink-2">Freezer and pantry</span>
              <span className="text-[13px] text-ink-2">Add with a receipt or another video</span>
            </span>
            <Icon name="chevron-right" size={18} className="text-ink-2" />
          </Link>
        </section>
      )}

      {s.notMine.length > 0 && (
        <details className="group">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-[14px] text-ink-2">
            <Icon name="chevron-right" size={16} className="transition-transform group-open:rotate-90" />
            {s.notMine.length} {s.notMine.length === 1 ? "item" : "items"} marked &quot;not mine&quot;. Never used.
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {s.notMine.map((i) => (
              <ItemRow key={i.id} item={i} today={today} muted detail="Not yours" right={<span />} />
            ))}
          </ul>
        </details>
      )}

      {!empty && s.ready.length === 0 && s.toCheck.length > 0 && (
        <p className="text-[14px] text-ink-2">Nothing is ready to cook until you check {itemTitle(s.toCheck[0]).toLowerCase()} and the rest.</p>
      )}
    </main>
  );
}
