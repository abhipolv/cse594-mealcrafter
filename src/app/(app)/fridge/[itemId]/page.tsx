// G13 Item detail. Figma 98:1225 (same as 07, 3:328). Track C. Update 6: the
// storage guideline with its source, and links to meals that use the item.
// Rule 3: shows the basis (age, guideline, source) and never says "safe".
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, gte } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getItems } from "@/lib/data/items";
import { getProfile, ruleContext } from "@/lib/data/profile";
import { CONFIDENCE, itemTitle, keptOutReason, reviewQuestion, STATE_LABEL, expiryOf, urgencyOf } from "@/lib/items";
import { FOODKEEPER_SOURCE } from "@/lib/foodkeeper";
import { addDays, daysBetween, formatDay, relativeDay, today as todayIso } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { sourceLine } from "@/components/evidence-box";
import { ConfidenceChip } from "@/components/confidence-chip";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { changeItem, setOpened } from "../actions";
import { EditForm } from "./edit-form";

export default async function ItemDetailPage({ params }: PageProps<"/fridge/[itemId]">) {
  const user = await requireUser();
  const { itemId } = await params;
  const today = todayIso();
  if (!/^[0-9a-f-]{36}$/.test(itemId)) notFound();
  const [[item], profile] = await Promise.all([getItems(user.id, undefined, [itemId]), getProfile(user.id)]);
  if (!item) notFound();
  const ctx = ruleContext(profile);

  const [meal] = item.reservedForMealId
    ? await db
        .select({ id: schema.plannedMeals.id, day: schema.plannedMeals.day, title: schema.plannedMeals.title })
        .from(schema.plannedMeals)
        .where(and(eq(schema.plannedMeals.id, item.reservedForMealId), eq(schema.plannedMeals.userId, user.id)))
    : [];

  // Meals suggested in the last week that use this item (update 6).
  const recent = await db
    .select({ id: schema.suggestions.id, shown: schema.suggestions.shown })
    .from(schema.suggestions)
    .where(and(eq(schema.suggestions.userId, user.id), gte(schema.suggestions.createdAt, new Date(`${addDays(today, -7)}T00:00:00Z`))))
    .orderBy(desc(schema.suggestions.createdAt))
    .limit(20);
  const usedIn = new Map<string, string>();
  for (const s of recent) {
    s.shown.forEach((m, i) => {
      if (m.ingredients.some((g) => g.itemId === item.id) && !usedIn.has(m.title)) usedIn.set(m.title, `/recipe/s.${s.id}.${i}`);
    });
  }

  const u = expiryOf(item);
  const urgency = urgencyOf(u.day, today);
  const age = daysBetween(item.addedDay, today);
  const keptOut = item.status === "ready" ? keptOutReason(item, ctx) : null;
  const statusTag =
    item.status === "needs_check"
      ? "Waiting for your check"
      : item.status === "reserved"
        ? "Saved for a planned meal"
        : item.status === "not_mine"
          ? "Not yours"
          : item.status === "unclear"
            ? "Couldn't see clearly"
            : keptOut
              ? "Kept out of meals"
              : "Ready to cook";
  const openable = item.state !== "frozen" && item.state !== "leftover" && item.state !== "cooked";
  const q = item.status === "needs_check" ? reviewQuestion(item, ctx) : null;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-8">
      <ScreenView code="G13" />
      <PageHeader back="/fridge" title={itemTitle(item)} />

      <div className="-mt-1 flex flex-wrap gap-2">
        <span className="tag text-ink-2">{STATE_LABEL[item.state]}</span>
        <span className={item.status === "needs_check" ? "chip-maize" : "tag"}>{statusTag}</span>
      </div>

      {item.media && (
        <div className="relative h-[220px] w-full overflow-hidden rounded-xl bg-line">
          <Image
            src={`/api/media/${item.media.id}`}
            alt={`Photo where ${item.name} was seen`}
            fill
            unoptimized
            sizes="390px"
            className="object-cover"
            style={
              item.evidence.box
                ? { objectPosition: `${(item.evidence.box.x + item.evidence.box.w / 2) * 100}% ${(item.evidence.box.y + item.evidence.box.h / 2) * 100}%` }
                : undefined
            }
          />
        </div>
      )}

      {q && (
        <Link href="/check?from=/fridge" className="card-check pressable flex flex-col gap-1">
          <span className="text-[16px] font-semibold">{q.question}</span>
          <span className="text-[14px] text-ink-2">Kept out of your meals until you answer.</span>
          <span className="font-semibold">Answer now &gt;</span>
        </Link>
      )}

      <section className="card flex flex-col gap-2" aria-labelledby="source">
        <div className="flex items-center justify-between gap-2">
          <h2 id="source" className="text-[14px] font-semibold text-ink-2">
            Where this came from
          </h2>
          {item.scanSource && item.scanSource !== "typed" && <ConfidenceChip level={item.confidence} />}
        </div>
        <p className="text-[15px] leading-snug">{sourceLine(item)}</p>
        {item.evidence.text && <p className="text-[15px] leading-snug">Label or receipt: &quot;{item.evidence.text}&quot;</p>}
        {item.scanSource && item.scanSource !== "typed" && (
          <p className="sr-only">Recognizer confidence: {CONFIDENCE[item.confidence].label}</p>
        )}
        {keptOut && <p className="text-[14px] text-ink-2">Not in your meals: {keptOut.toLowerCase()}.</p>}
      </section>

      {openable && (
        <section className="flex flex-col gap-2" aria-labelledby="opened">
          <h2 id="opened" className="section-label">
            Opened?
          </h2>
          <form action={setOpened} className="flex gap-2">
            <input type="hidden" name="id" value={item.id} />
            <button name="opened" value="no" aria-pressed={!item.openedAt} className="chip">
              {!item.openedAt && <Icon name="check" size={16} />}
              Sealed
            </button>
            <button name="opened" value="yes" aria-pressed={!!item.openedAt} className="chip">
              {item.openedAt && <Icon name="check" size={16} />}
              {item.openedAt ? `Opened ${relativeDay(item.openedAt, today)}` : "Opened"}
            </button>
          </form>
        </section>
      )}

      <section className="card flex flex-col gap-2" aria-labelledby="keeps">
        <h2 id="keeps" className="text-[14px] font-semibold text-ink-2">
          How long it keeps
        </h2>
        {u.advice ? (
          <p className="text-[15px] leading-snug">
            {u.advice.text} ({FOODKEEPER_SOURCE}, &quot;{u.advice.guideline.label}&quot;).
          </p>
        ) : (
          <p className="text-[15px] leading-snug">{FOODKEEPER_SOURCE} has no entry for this food. Check the package.</p>
        )}
        <p className="text-[15px] leading-snug">
          {item.state === "leftover" || item.state === "cooked" ? "Made" : "Added"} {age <= 0 ? "today" : age === 1 ? "yesterday" : `${age} days ago`}
          {u.day &&
            (urgency === "past"
              ? `. The ${u.estimated ? "estimated " : ""}use-by date was ${formatDay(u.day, { weekday: "short", month: "short", day: "numeric" })}.`
              : `: use by ${u.estimated ? "about " : ""}${formatDay(u.day, { weekday: "short", month: "short", day: "numeric" })}${u.estimated ? " (estimate)" : ""}.`)}
        </p>
      </section>

      <p className="note flex items-start gap-2">
        <Icon name="info" size={20} className="mt-px shrink-0" />
        I can&apos;t tell if food is safe. Check before eating.
      </p>

      {(meal || usedIn.size > 0) && (
        <section className="flex flex-col gap-2" aria-labelledby="meals">
          <h2 id="meals" className="section-label">
            Meals with this
          </h2>
          <ul className="flex flex-col gap-2">
            {meal && (
              <li>
                <Link href="/plan" className="card pressable flex items-center gap-3 !py-3">
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">{meal.title}</span>
                    <span className="text-[13px] text-ink-2">Planned for {formatDay(meal.day, { weekday: "long" })}</span>
                  </span>
                  <Icon name="chevron-right" size={18} className="text-ink-2" />
                </Link>
              </li>
            )}
            {[...usedIn].map(([title, href]) => (
              <li key={href}>
                <Link href={href} className="card pressable flex items-center gap-3 !py-3">
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">{title}</span>
                    <span className="text-[13px] text-ink-2">Suggested this week</span>
                  </span>
                  <Icon name="chevron-right" size={18} className="text-ink-2" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-1 flex flex-wrap gap-2">
        <EditForm id={item.id} name={item.name} quantity={item.quantity ?? ""} state={item.state} useBy={item.useBy ?? ""} />
        {item.state === "frozen" && (
          <form action={changeItem} className="flex-1">
            <input type="hidden" name="id" value={item.id} />
            <SubmitButton name="to" value="thaw" className="btn w-full" pending="Moving...">
              Moved to the fridge
            </SubmitButton>
          </form>
        )}
        <form action={changeItem} className="flex-1">
          <input type="hidden" name="id" value={item.id} />
          <SubmitButton name="to" value="used" className="btn w-full" pending="Saving...">
            Used up
          </SubmitButton>
        </form>
      </div>
      <form action={changeItem} className="-mt-1 flex flex-wrap gap-x-2">
        <input type="hidden" name="id" value={item.id} />
        {item.status !== "not_mine" && (
          <SubmitButton name="to" value="not_mine" className="min-h-[44px] rounded-lg px-2 text-[15px] font-semibold active:bg-fill" pending="Saving...">
            Not mine
          </SubmitButton>
        )}
        <SubmitButton name="to" value="rejected" className="min-h-[44px] rounded-lg px-2 text-[15px] font-semibold active:bg-fill" pending="Removing...">
          Not in my fridge, remove
        </SubmitButton>
      </form>
    </main>
  );
}
