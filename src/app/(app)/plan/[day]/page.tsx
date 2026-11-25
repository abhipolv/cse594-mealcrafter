// 13 Day sheet. Figma 4:318. Track D. Skip, move or swap one day's dinner.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getWeekView } from "@/lib/data/plan";
import { formatDay } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { TrackLink } from "@/components/track-link";
import { moveMeal } from "../actions";
import { Sheet } from "../sheet";
import { WeekList } from "../week-list";

export default async function DaySheetPage({ params }: PageProps<"/plan/[day]">) {
  const user = await requireUser();
  const { day } = await params;
  const { rows, today, days } = await getWeekView(user.id);
  const row = rows.find((r) => r.day === day);
  if (!row || day < today) notFound();
  const meal = row.meal;
  const weekday = formatDay(day, { weekday: "long" });
  const behind = (
    <>
      <PageHeader title="This week's dinners" />
      <WeekList rows={rows} today={today} linked={false} />
    </>
  );
  const option = "card pressable flex flex-col gap-0.5 text-left";

  return (
    <main className="flex flex-1 flex-col">
      <ScreenView code="13" />
      <Sheet behind={behind} label={`${weekday} dinner`}>
        <p className="text-[14px] font-medium text-ink-2">{weekday}</p>
        <h1 className="text-[22px] leading-tight font-bold">{meal?.title ?? "Nothing planned"}</h1>

        {meal?.status === "planned" ? (
          <>
            {meal.recipe && (
              <Link href={`/recipe/p.${meal.id}`} className={option}>
                <span className="text-[17px] font-semibold">See the recipe</span>
                <span className="text-[14px] text-ink-2">Cook it, or check what it needs.</span>
              </Link>
            )}
            <TrackLink href={`/plan/${day}/skip`} screen="13" target="skip" className={option}>
              <span className="text-[17px] font-semibold">Skip this meal</span>
              <span className="text-[14px] text-ink-2">I will find another use for the food saved for it.</span>
            </TrackLink>
            <details className="card group">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <span className="text-[17px] font-semibold">Move to another day</span>
                <Icon name="chevron-right" size={18} className="transition-transform group-open:rotate-90" />
              </summary>
              <form action={moveMeal} className="mt-3 grid grid-cols-4 gap-2">
                <input type="hidden" name="id" value={meal.id} />
                {days
                  .filter((d) => d >= today && d !== day)
                  .map((d) => (
                    <SubmitButton key={d} name="to" value={d} className="chip !px-0 text-[14px]" pending="...">
                      {formatDay(d, { weekday: "short" })}
                    </SubmitButton>
                  ))}
              </form>
              <p className="mt-2 text-[13px] text-ink-2">If that day has a dinner, the two swap.</p>
            </details>
            <TrackLink href={`/cook?for=${day}`} screen="13" target="swap" className={option}>
              <span className="text-[17px] font-semibold">Swap for something else</span>
              <span className="text-[14px] text-ink-2">Pick a new meal from what you have.</span>
            </TrackLink>
          </>
        ) : (
          <>
            {meal?.status === "skipped" && <p className="text-[15px] text-ink-2">Skipped{meal.skipReason ? `: ${meal.skipReason.toLowerCase()}` : ""}.</p>}
            {meal?.status === "cooked" && meal.recipe && (
              <Link href={`/recipe/p.${meal.id}`} className={option}>
                <span className="text-[17px] font-semibold">See the recipe</span>
              </Link>
            )}
            {meal?.status !== "cooked" && (
              <TrackLink href={day === today ? "/cook" : `/cook?for=${day}`} screen="13" target="plan_day" className={option}>
                <span className="text-[17px] font-semibold">{day === today ? "What can I cook now?" : "Plan a dinner"}</span>
                <span className="text-[14px] text-ink-2">Ideas from what is in your fridge, checked against your rules.</span>
              </TrackLink>
            )}
          </>
        )}
        <Link href="/plan" className="btn mt-1">
          Cancel
        </Link>
      </Sheet>
    </main>
  );
}
