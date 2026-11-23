// 09 Meal results. Figma 3:407. Track D. The rule filter ran in suggestMeals()
// before anything is shown, and each meal is checked again here against
// today's fridge (N1). "Not shown" lists the removed meals and why. Update 7:
// food saved for a planned meal can be used on purpose ("Use it anyway").
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getProfile, ruleContext } from "@/lib/data/profile";
import { checkMeal } from "@/lib/rules/filter";
import { dollars, fitsText, humanizeReason } from "@/lib/rules-text";
import { formatDay, relativeDay, today as todayIso } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { TrackEvent } from "@/components/track-event";
import { planMeal } from "../../plan/actions";
import { MealCards, type MealCardData } from "./meal-cards";

export default async function MealResultsPage({ searchParams }: PageProps<"/cook/results">) {
  const user = await requireUser();
  const id = (await searchParams).s;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db
    .select()
    .from(schema.suggestions)
    .where(and(eq(schema.suggestions.id, id), eq(schema.suggestions.userId, user.id)));
  if (!row) notFound();
  const today = todayIso();
  const { minutes, readyOnly, allowReserved, forDay } = row.request;
  const ctx = ruleContext(await getProfile(user.id));

  const inventory = await db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.userId, user.id), inArray(schema.items.status, ["ready", "needs_check", "reserved", "not_mine", "unclear"])));
  const reservedMealIds = [...new Set(inventory.map((i) => i.reservedForMealId).filter((x): x is string => !!x))];
  const meals = reservedMealIds.length
    ? await db
        .select({ id: schema.plannedMeals.id, day: schema.plannedMeals.day, title: schema.plannedMeals.title })
        .from(schema.plannedMeals)
        .where(inArray(schema.plannedMeals.id, reservedMealIds))
    : [];
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const usable = (status: string) => (status === "reserved" && allowReserved ? "ready" : status);
  const byId = new Map(inventory.map((i) => [i.id, { ...i, status: usable(i.status) }]));
  const fits = fitsText(ctx.tags, ctx.customWords);

  // Check again with today's fridge and rules; anything that fails now joins "Not shown".
  const lateFiltered: { title: string; reasons: string[] }[] = [];
  const cards: MealCardData[] = [];
  row.shown.forEach((m, i) => {
    const r = checkMeal(
      m.ingredients.map((g) => ({ name: g.name, itemId: g.itemId })),
      ctx.tags,
      byId,
      ctx.customWords,
    );
    if (!r.allowed) {
      lateFiltered.push({ title: m.title, reasons: r.reasons });
      return;
    }
    const saved = m.ingredients
      .map((g) => (g.itemId ? inventory.find((x) => x.id === g.itemId && x.status === "reserved") : undefined))
      .filter((x) => !!x);
    const savedText = saved.length
      ? saved
          .map((s) => {
            const pm = s.reservedForMealId ? mealById.get(s.reservedForMealId) : undefined;
            return `Uses the ${s.name.toLowerCase()} saved for ${pm ? `${relativeDay(pm.day, today)}'s ${pm.title.toLowerCase()}` : "a planned meal"}. You can change that meal after.`;
          })
          .join(" ")
      : null;
    cards.push({
      ref: `s.${row.id}.${i}`,
      title: m.title,
      facts: [
        `${m.minutes} min`,
        `${m.pans} ${m.pans === 1 ? "pan" : "pans"}`,
        m.extraCostCents ? `${dollars(m.extraCostCents)} extra` : "$0 extra",
        m.leftovers ? "leftovers" : null,
      ]
        .filter(Boolean)
        .join(", "),
      why: m.why ?? null,
      fits,
      usesSaved: savedText,
    });
  });

  // Why food was not offered at all, not only meals the filter removed.
  const notShown: { text: string; action?: { href: string; label: string } }[] = [];
  for (const f of [...row.filteredOut, ...lateFiltered]) {
    notShown.push({ text: `${f.title}: ${f.reasons.map(humanizeReason).join("; ")}.` });
  }
  const unchecked = inventory.filter((i) => i.status === "needs_check");
  if (unchecked.length) {
    notShown.push({
      text: `${unchecked.length} ${unchecked.length === 1 ? "item waits" : "items wait"} for your check (${unchecked
        .slice(0, 3)
        .map((i) => i.name.toLowerCase())
        .join(", ")}${unchecked.length > 3 ? ", ..." : ""}).`,
      action: { href: "/check?from=/", label: "Check them" },
    });
  }
  if (readyOnly) {
    const frozen = inventory.filter((i) => i.state === "frozen" && (i.status === "ready" || i.status === "reserved"));
    if (frozen.length) notShown.push({ text: `Still frozen: ${frozen.map((i) => i.name.toLowerCase()).join(", ")}.` });
  }
  if (!allowReserved) {
    const saved = inventory.filter((i) => i.status === "reserved");
    const byMeal = new Map<string, string[]>();
    for (const s of saved) byMeal.set(s.reservedForMealId ?? "", [...(byMeal.get(s.reservedForMealId ?? "") ?? []), s.name.toLowerCase()]);
    for (const [mealId, names] of byMeal) {
      const pm = mealById.get(mealId);
      notShown.push({
        text: `${names.join(" and ")} ${names.length === 1 ? "is" : "are"} saved for ${pm ? `${relativeDay(pm.day, today)}'s ${pm.title.toLowerCase()}` : "a planned meal"}.`,
        action: { href: `/cook?reserved=1&minutes=${minutes}`, label: "Use it anyway" },
      });
    }
  }

  const n = cards.length;
  const planDay = forDay ? { iso: forDay, label: formatDay(forDay, { weekday: "short" }) } : null;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-8">
      <ScreenView code="09" />
      <TrackEvent
        name="suggest"
        screen="09"
        props={{ suggestionId: row.id, minutes, readyOnly, allowReserved: !!allowReserved, shown: n, filtered: row.filteredOut.length + lateFiltered.length, model: row.model }}
      />
      <PageHeader
        back={forDay ? `/cook?for=${forDay}` : "/cook"}
        title={n === 0 ? "No meals fit right now" : `${n} ${n === 1 ? "meal" : "meals"} in ${minutes} minutes or less`}
        subtitle={`${readyOnly ? "Ready food only." : "Frozen food included."} ${fits ? "Checked against your profile." : ""}`}
      />

      <MealCards meals={cards} suggestionId={row.id} planDay={planDay} planAction={planMeal} />

      {n === 0 && (
        <div className="flex flex-col gap-2">
          <Link href={`/cook?minutes=45${forDay ? `&for=${forDay}` : ""}`} className="btn">
            Try with more time
          </Link>
          <Link href="/add" className="btn">
            Add food
          </Link>
        </div>
      )}

      {notShown.length > 0 && (
        <section className="note flex flex-col gap-2 !p-4" aria-labelledby="not-shown">
          <h2 id="not-shown" className="text-[14px] font-semibold text-ink-2">
            Not shown
          </h2>
          <ul className="flex flex-col gap-2.5 text-[14px] leading-snug">
            {notShown.map((x, i) => (
              <li key={i} className="flex flex-col items-start gap-1">
                <span>- {x.text}</span>
                {x.action && (
                  <Link href={x.action.href} className="inline-flex min-h-[36px] items-center font-semibold underline underline-offset-2">
                    {x.action.label} &gt;
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
