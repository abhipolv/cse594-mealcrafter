import Link from "next/link";
import type { DayRow } from "@/lib/data/plan";
import { formatDay, relativeDay } from "@/lib/time";
import { Icon } from "@/components/icons";

/** The week of dinners (12), also drawn dimmed behind the sheets (13, 14) and with highlights on 16. */
export function WeekList({
  rows,
  today,
  labels,
  linked = true,
}: {
  rows: DayRow[];
  today: string;
  labels?: Record<string, string>;
  linked?: boolean;
}) {
  return (
    <ol className="flex flex-col gap-2.5">
      {rows.map(({ day, meal, saved, thaw }) => {
        const past = day < today;
        const isToday = day === today;
        const changed = labels?.[day];
        const muted = past || meal?.status === "skipped" || meal?.status === "cooked";
        // Gray tags would vanish on a highlighted (gray) row.
        const tag = changed ? "tag !bg-paper" : "tag";
        const title = meal
          ? meal.title
          : isToday
            ? "Tonight: pick from what is ready"
            : past
              ? "Nothing logged"
              : "Nothing planned";
        const body = (
          <>
            <span className={`w-11 shrink-0 pt-px text-[15px] font-semibold ${past ? "text-ink-2" : ""}`}>
              {formatDay(day, { weekday: "short" })}
              {isToday && <span className="mt-0.5 block text-[11px] font-semibold tracking-wide text-ink-2 uppercase">Today</span>}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className={`text-[16px] leading-snug ${muted || !meal ? "text-ink-2" : ""} ${meal?.status === "skipped" ? "line-through" : ""}`}>{title}</span>
              {(meal?.status === "cooked" || meal?.status === "skipped" || saved.length > 0 || thaw.length > 0 || changed) && (
                <span className="flex flex-wrap gap-1.5">
                  {changed && <span className="rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-paper">{changed}</span>}
                  {meal?.status === "cooked" && <span className={tag}>Cooked</span>}
                  {meal?.status === "skipped" && <span className={tag}>{meal.skipReason ? `Skipped: ${meal.skipReason.toLowerCase()}` : "Skipped"}</span>}
                  {saved.map((s) => (
                    <span key={s.name} className={tag}>
                      Uses {s.name.toLowerCase()}
                      {s.useBy ? ` (use by ${relativeDay(s.useBy, today)})` : ""}
                    </span>
                  ))}
                  {thaw.map((t) => (
                    <span key={t} className="chip-maize">
                      <Icon name="snowflake" size={13} className="mr-1" />
                      Move {t.toLowerCase()} to thaw {day === today ? "now" : "tonight"}
                    </span>
                  ))}
                </span>
              )}
            </span>
            {linked && !past && <Icon name="chevron-right" size={18} className="mt-0.5 shrink-0 text-ink-2" />}
          </>
        );
        const cls = `flex items-start gap-3 rounded-xl border-[1.5px] px-4 py-3.5 ${changed ? "border-ink bg-fill" : past ? "border-line" : "border-ink"}`;
        return (
          <li key={day}>
            {linked && !past ? (
              <Link href={isToday && !meal ? "/cook" : `/plan/${day}`} className={`${cls} pressable`}>
                {body}
              </Link>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
