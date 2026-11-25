// 12 Week plan. Figma 4:261. Track D. This week's dinners; tap a day to skip,
// move or swap it. Shows the food saved for each meal and thaw reminders.
import { requireUser } from "@/lib/auth/session";
import { getWeekView } from "@/lib/data/plan";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { WeekList } from "./week-list";

export default async function PlanPage() {
  const user = await requireUser();
  const { rows, today } = await getWeekView(user.id);
  const planned = rows.filter((r) => r.meal?.status === "planned").length;
  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-6">
      <ScreenView code="12" />
      <PageHeader
        title="This week's dinners"
        subtitle={planned ? "Tap a day to skip it, move it or swap it." : "Nothing planned yet. Tap a day to plan a dinner."}
      />
      <WeekList rows={rows} today={today} />
    </main>
  );
}
