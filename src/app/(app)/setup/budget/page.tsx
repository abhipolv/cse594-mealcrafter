// G04 Budget and time. Figma 96:1081. Track A. Update 5 (E2): buttons do not
// shift when selected (the check mark's space is always reserved).
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/data/profile";
import { ScreenView } from "@/components/screen-view";
import { SetupHeader } from "../setup-parts";
import { BudgetForm } from "./budget-form";

export default async function BudgetPage({ searchParams }: PageProps<"/setup/budget">) {
  const user = await requireUser();
  const fromProfile = (await searchParams).from === "profile";
  const p = await getProfile(user.id);
  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2">
      <ScreenView code="G04" />
      <SetupHeader step={3} title="Budget and time" back="/setup/rules" fromProfile={fromProfile} />
      <BudgetForm
        period={p?.budgetPeriod ?? "week"}
        amount={p?.budgetCents ? String(p.budgetCents / 100) : ""}
        minutes={p?.usualCookMinutes ?? 20}
        goals={p?.goals ?? []}
        fromProfile={fromProfile}
      />
    </main>
  );
}
