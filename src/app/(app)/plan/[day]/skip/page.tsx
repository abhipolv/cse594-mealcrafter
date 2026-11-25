// 14 Skip reason. Figma 4:334. Track D. Update 10: say on screen what the
// reason is used for. The answer is optional.
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getWeekView } from "@/lib/data/plan";
import { SKIP_REASONS } from "@/lib/plan-text";
import { formatDay } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { skipMeal } from "../../actions";
import { Sheet } from "../../sheet";
import { WeekList } from "../../week-list";

export default async function SkipReasonPage({ params }: PageProps<"/plan/[day]/skip">) {
  const user = await requireUser();
  const { day } = await params;
  const { rows, today } = await getWeekView(user.id);
  const row = rows.find((r) => r.day === day);
  if (!row?.meal || row.meal.status !== "planned") notFound();
  const weekday = formatDay(day, { weekday: "long" });
  const behind = (
    <>
      <PageHeader title="This week's dinners" />
      <WeekList rows={rows} today={today} linked={false} />
    </>
  );
  return (
    <main className="flex flex-1 flex-col">
      <ScreenView code="14" />
      <Sheet behind={behind} label="Why skip" closeHref={`/plan/${day}`}>
        <h1 className="text-[22px] leading-tight font-bold">What is happening on {weekday}?</h1>
        <p className="text-[14px] leading-snug text-ink-2">
          Optional. I only use your answer to plan better weeks, like planning fewer dinners on nights you are often out.
        </p>
        <form action={skipMeal} className="flex flex-col gap-2.5">
          <input type="hidden" name="id" value={row.meal.id} />
          {Object.entries(SKIP_REASONS).map(([value, label]) => (
            <SubmitButton key={value} name="reason" value={value} className="btn justify-start text-left text-[16px] !font-medium" pending="Saving...">
              {label}
            </SubmitButton>
          ))}
          <SubmitButton name="reason" value="" className="btn mt-1" pending="Saving...">
            Skip this question
          </SubmitButton>
        </form>
      </Sheet>
    </main>
  );
}
