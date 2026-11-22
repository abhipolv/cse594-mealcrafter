// 01 Home. Figma 3:22. Track D owns further changes (update 6).
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getHomeData } from "@/lib/data/home";
import { ScreenView } from "@/components/screen-view";
import { formatDay, localHour, today as todayIso } from "@/lib/time";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}


export default async function HomePage() {
  const user = await requireUser();
  const today = todayIso();
  const { toCheck, week } = await getHomeData(user.id, today);

  return (
    <main className="flex flex-col gap-4 px-5 pb-6 pt-6">
      <ScreenView code="01" />
      <header>
        <h1 className="text-[28px] font-bold leading-tight">
          {greeting(localHour())}, {user.displayName}
        </h1>
        <p className="mt-1 text-ink-2">{formatDay(today, { weekday: "long", month: "short", day: "numeric" })}</p>
      </header>

      <Link href="/cook" className="btn-primary text-[17px]">
        What can I cook now?
      </Link>

      {toCheck > 0 && (
        <Link href="/check" className="card-check flex flex-col gap-1">
          <span className="text-[18px] font-semibold">
            {toCheck} {toCheck === 1 ? "item needs" : "items need"} your check
          </span>
          <span className="text-ink-2">Kept out of your meals until you check them.</span>
          <span className="font-semibold">Check now &gt;</span>
        </Link>
      )}

      <section className="card flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[18px] font-semibold">This week</h2>
          <Link href="/plan" className="font-semibold text-ink-2">
            Plan &gt;
          </Link>
        </div>
        {week.length === 0 ? (
          <p className="text-ink-2">No dinners planned yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {week.map((m) => (
              <li key={m.id} className="grid grid-cols-[52px_1fr]">
                <span className="font-semibold">{formatDay(m.day, { weekday: "short" })}</span>
                <span>{m.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/add" className="btn text-[17px]">
        + Add food
      </Link>
    </main>
  );
}
