// 16 Updated plan. Figma 4:387. Track D. The week after a change, with the
// changed days highlighted and labelled, and Undo.
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getWeekView } from "@/lib/data/plan";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { Icon } from "@/components/icons";
import { undoPlanChange } from "../actions";
import { WeekList } from "../week-list";

export default async function PlanUpdatedPage({ searchParams }: PageProps<"/plan/updated">) {
  const user = await requireUser();
  const id = (await searchParams).change;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [change] = await db
    .select()
    .from(schema.planChanges)
    .where(and(eq(schema.planChanges.id, id), eq(schema.planChanges.userId, user.id)));
  if (!change) notFound();
  const { rows, today } = await getWeekView(user.id);
  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-6">
      <ScreenView code="16" />
      <PageHeader title="Plan updated" subtitle={change.undoneAt ? "You undid this change." : "Changes are highlighted."} />
      {!change.undoneAt && (
        <form action={undoPlanChange}>
          <input type="hidden" name="change" value={change.id} />
          <SubmitButton className="btn !min-h-[44px] text-[15px]" pending="Undoing...">
            <Icon name="undo" size={18} />
            Undo
          </SubmitButton>
        </form>
      )}
      <WeekList rows={rows} today={today} labels={change.undoneAt ? undefined : change.labels} />
    </main>
  );
}
