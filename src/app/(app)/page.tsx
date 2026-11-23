// 01 Home. Figma 3:22. Track D. Update 6: fewer cards competing with "What
// can I cook now?"; the other cards sit under a "Reminders" label, at most two.
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getProfile, ruleContext } from "@/lib/data/profile";
import { getWeekView } from "@/lib/data/plan";
import { getItems, lastUpdate } from "@/lib/data/items";
import { groupFridge, itemTitle, expiryOf, urgencyOf } from "@/lib/items";
import { thawNeeds } from "@/lib/plan-logic";
import { dayOf, daysBetween, formatDay, localHour, relativeDay, today as todayIso } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { TrackLink } from "@/components/track-link";
import { SubmitButton } from "@/components/submit-button";
import { Icon } from "@/components/icons";
import { changeItem } from "./fridge/actions";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const STALE_DAYS = 4;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.setupCompletedAt) redirect("/setup");
  const cooked = (await searchParams).cooked === "1";
  const today = todayIso();
  const [items, week, updated] = await Promise.all([getItems(user.id, ["ready", "needs_check", "reserved"]), getWeekView(user.id), lastUpdate(user.id)]);
  const s = groupFridge(items, ruleContext(profile));

  // Reminders, most useful first; only the top two show (update 6).
  const reminders: React.ReactNode[] = [];
  if (s.toCheck.length > 0) {
    reminders.push(
      <TrackLink key="check" href="/check?from=/" screen="01" target="check_reminder" className="card-check pressable flex flex-col gap-1">
        <span className="text-[17px] font-semibold">
          {s.toCheck.length} {s.toCheck.length === 1 ? "item needs" : "items need"} your check
        </span>
        <span className="text-[15px] text-ink-2">Kept out of your meals until you check them.</span>
        <span className="mt-0.5 font-semibold">Check now &gt;</span>
      </TrackLink>,
    );
  }
  const thaw = thawNeeds(week.meals, week.items, today)[0];
  if (thaw) {
    reminders.push(
      <section key="thaw" className="card flex flex-col gap-1.5" aria-label="Thaw reminder">
        <h3 className="flex items-start gap-2 text-[17px] leading-snug font-semibold">
          <Icon name="snowflake" size={20} className="mt-0.5 shrink-0" />
          Move the {thaw.item.name.toLowerCase()} to the fridge {thaw.meal.day === today ? "now" : "tonight"}
        </h3>
        <p className="text-[15px] text-ink-2">
          Frozen. It is for {thaw.meal.day === today ? "tonight's" : `${formatDay(thaw.meal.day, { weekday: "long" })}'s`} {thaw.meal.title.toLowerCase()}; thaw it in the fridge.
        </p>
        <form action={changeItem} className="mt-1">
          <input type="hidden" name="id" value={thaw.item.id} />
          <input type="hidden" name="screen" value="01" />
          <SubmitButton name="to" value="thaw" className="btn-primary btn-sm !min-h-[40px]" pending="Saving...">
            Done, it&apos;s in the fridge
          </SubmitButton>
        </form>
      </section>,
    );
  }
  const soon = s.ready.filter((i) => urgencyOf(expiryOf(i).day, today) !== "ok" && expiryOf(i).day);
  if (soon.length > 0) {
    const first = soon[0];
    const u = expiryOf(first);
    reminders.push(
      <TrackLink key="soon" href={`/fridge/${first.id}`} screen="01" target="use_soon_reminder" className="card pressable flex flex-col gap-1">
        <span className="text-[17px] font-semibold">
          {urgencyOf(u.day, today) === "past" ? `Check the ${itemTitle(first).toLowerCase()}` : `Use the ${itemTitle(first).toLowerCase()} soon`}
        </span>
        <span className="text-[15px] text-ink-2">
          {urgencyOf(u.day, today) === "past"
            ? `Its ${u.estimated ? "estimated " : ""}use-by date has passed. Check it before using it.`
            : `Use by ${u.estimated ? "about " : ""}${relativeDay(u.day!, today)}.`}
          {soon.length > 1 ? ` ${soon.length - 1} more ${soon.length === 2 ? "item is" : "items are"} close to the date.` : ""}
        </span>
      </TrackLink>,
    );
  }
  const age = updated ? daysBetween(dayOf(updated.at), today) : null;
  if (age === null || age >= STALE_DAYS) {
    reminders.push(
      <TrackLink key="scan" href="/add" screen="01" target="rescan_reminder" className="card pressable flex flex-col gap-1">
        <span className="text-[17px] font-semibold">{age === null ? "Show me your fridge" : `Your fridge list is ${age} days old`}</span>
        <span className="text-[15px] text-ink-2">A 15-second video keeps your meal ideas accurate.</span>
      </TrackLink>,
    );
  }
  const shown = reminders.slice(0, 2);
  const upcoming = week.rows.filter((r) => r.day >= today && r.meal?.status === "planned").slice(0, 3);

  return (
    <main className="flex flex-col gap-4 px-5 pt-6 pb-6">
      <ScreenView code="01" />
      {cooked && (
        <p role="status" className="note fade-in flex items-center gap-2 !py-3 font-medium">
          <Icon name="check" size={20} />
          Saved. Your fridge list is up to date.
        </p>
      )}
      <header>
        <h1 className="text-[26px] leading-tight font-bold">
          {greeting(localHour())}, {user.displayName}
        </h1>
        <p className="mt-1 text-ink-2">{formatDay(today, { weekday: "long", month: "short", day: "numeric" })}</p>
      </header>

      <TrackLink href="/cook" screen="01" target="cook_now" className="btn-primary text-[17px]">
        What can I cook now?
      </TrackLink>

      {shown.length > 0 && (
        <section className="flex flex-col gap-2.5" aria-labelledby="reminders">
          <h2 id="reminders" className="section-label">
            Reminders
          </h2>
          {shown}
          {reminders.length > shown.length && (
            <Link href="/fridge" className="text-[14px] font-semibold text-ink-2">
              {reminders.length - shown.length} more in your fridge &gt;
            </Link>
          )}
        </section>
      )}

      <section className="card flex flex-col gap-2" aria-labelledby="week">
        <div className="flex items-baseline justify-between">
          <h2 id="week" className="text-[18px] font-semibold">
            This week
          </h2>
          <Link href="/plan" className="-my-2 inline-flex min-h-[44px] items-center font-semibold text-ink-2">
            Plan &gt;
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-ink-2">No dinners planned yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {upcoming.map((r) => (
              <li key={r.day} className="grid grid-cols-[52px_1fr] text-[15px]">
                <span className="font-semibold">{r.day === today ? "Today" : formatDay(r.day, { weekday: "short" })}</span>
                <span>{r.meal!.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TrackLink href="/add" screen="01" target="add_food" className="btn text-[17px]">
        <Icon name="plus" size={20} />
        Add food
      </TrackLink>
    </main>
  );
}
