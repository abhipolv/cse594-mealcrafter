// 08 Cook now. Figma 3:367. Track D. Time, "ready now" switch, and the
// profile the suggestions are checked against.
import { requireUser } from "@/lib/auth/session";
import { getProfile, ruleContext } from "@/lib/data/profile";
import { dollars, rulesList } from "@/lib/rules-text";
import { formatDay } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { CookForm } from "./cook-form";

const PERIOD = { meal: "a meal", week: "a week", two_weeks: "every 2 weeks" } as const;

export default async function CookPage({ searchParams }: PageProps<"/cook">) {
  const user = await requireUser();
  const sp = await searchParams;
  const forDay = typeof sp.for === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.for) ? sp.for : "";
  const allowReserved = sp.reserved === "1";
  const profile = await getProfile(user.id);
  const ctx = ruleContext(profile);
  const asked = Number(sp.minutes);
  const minutes = [15, 20, 30, 45].includes(asked) ? asked : ([15, 20, 30, 45].find((m) => m >= (profile?.usualCookMinutes ?? 20)) ?? 45);

  const rules = rulesList(ctx.tags, ctx.customWords);
  const budget = profile?.budgetCents && profile.budgetPeriod ? `Budget: ${dollars(profile.budgetCents)} ${PERIOD[profile.budgetPeriod]}.` : "";
  const line = (
    <>
      {rules ? `Using your profile: ${rules}.` : "Your profile has no food rules."} {budget}
      {allowReserved && " Food saved for planned meals can be used this time."}
    </>
  );

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 pt-2 pb-8">
      <ScreenView code="08" />
      <PageHeader
        back={forDay ? "/plan" : "/"}
        title={forDay ? `A meal for ${formatDay(forDay, { weekday: "long" })}` : "What can I cook now?"}
        subtitle={forDay ? "Pick one to put on your plan." : undefined}
      />
      <CookForm minutes={minutes} forDay={forDay} allowReserved={allowReserved} profileLine={line} />
    </main>
  );
}
