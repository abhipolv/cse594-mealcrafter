// 17 Profile. Figma 4:456. Track A. Update 5: rules people often forget are
// offered again ("Anything else?"). Each card edits through the setup screen.
import Link from "next/link";
import { and, count, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getProfile } from "@/lib/data/profile";
import { logout } from "@/app/login/actions";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { Icon } from "@/components/icons";
import { profileSummary } from "../setup/profile-summary";

function Card({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-ink-2">{title}</h2>
        <Link href={href} className="-my-2 -mr-2 inline-flex min-h-[44px] items-center rounded-lg px-2 text-[15px] font-semibold active:bg-fill">
          Edit
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function ProfilePage() {
  const user = await requireUser();
  const p = await getProfile(user.id);
  const s = profileSummary(p);
  const [{ notMine }] = await db
    .select({ notMine: count() })
    .from(schema.items)
    .where(and(eq(schema.items.userId, user.id), eq(schema.items.status, "not_mine")));
  const consent = p?.fridgeConsentAt?.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Detroit" });

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-6">
      <ScreenView code="17" />
      <PageHeader title="Your profile" subtitle="Checked against every suggestion." />

      <Card title="Never eat" href="/setup/never-eat?from=profile">
        {s.allergies.length ? (
          s.allergies.map((a) => (
            <p key={a} className="text-[16px]">
              {a}
            </p>
          ))
        ) : (
          <p className="text-[16px] text-ink-2">No allergies</p>
        )}
      </Card>

      {s.rules.length > 0 ? (
        <Card title="Rules you follow" href="/setup/rules?from=profile">
          {s.rules.map((r) => (
            <p key={r} className="text-[16px]">
              {r}
            </p>
          ))}
        </Card>
      ) : (
        <section className="card-check flex flex-col gap-2">
          <h2 className="text-[17px] font-semibold">Anything else?</h2>
          <p className="text-[15px] leading-snug">Often forgotten: no pork, no gelatin, no alcohol in cooking.</p>
          <Link href="/setup/rules?from=profile" className="btn btn-sm mt-1 self-start">
            Add a rule
          </Link>
        </section>
      )}

      <Card title="Budget and time" href="/setup/budget?from=profile">
        <p className="text-[16px]">{s.budgetLong ?? "No budget set"}</p>
        {s.time && <p className="text-[15px] text-ink-2">{s.time}</p>}
        {s.goals.length > 0 && <p className="text-[15px] text-ink-2">{s.goals.join(", ")}</p>}
      </Card>

      <Card title="Your kitchen" href="/setup/kitchen?from=profile">
        <p className="text-[16px]">{s.kitchen[0] ?? "Not answered yet"}</p>
        {p?.fridgeShared && <p className="text-[15px]">{consent ? `Photo consent given ${consent}` : "Roommates not asked yet"}</p>}
        {notMine > 0 && (
          <p className="text-[14px] text-ink-2">
            {notMine} {notMine === 1 ? "item" : "items"} marked &quot;not mine&quot;. Never used.
          </p>
        )}
      </Card>

      <Card title="Cooking for" href="/setup/kitchen?from=profile">
        <p className="text-[16px]">{s.others ? `You and ${s.others} ${s.others === 1 ? "other" : "others"}` : "Just me"}</p>
        {s.others > 0 && p?.othersAgreedAt && <p className="text-[14px] text-ink-2">They agreed to it.</p>}
      </Card>

      <form action={logout} className="mt-2">
        <button className="btn w-full text-ink-2">
          <Icon name="logout" size={18} />
          Log out
        </button>
      </form>
      <p className="text-center text-[13px] text-ink-2">Logged in as {user.displayName}.</p>
    </main>
  );
}
