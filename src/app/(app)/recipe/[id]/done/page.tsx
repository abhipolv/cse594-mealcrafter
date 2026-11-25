// 11 Did you cook it? Figma 3:570. Track C. Update 2: ask whether it was
// cooked as suggested and let the user edit what was used. Nothing changes
// until Done.
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { loadRecipe, recheck } from "@/lib/data/recipes";
import { storageAdvice } from "@/lib/foodkeeper";
import { formatDay, today as todayIso } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { DoneForm, type DoneItem } from "./done-form";

export default async function DonePage({ params }: PageProps<"/recipe/[id]/done">) {
  const user = await requireUser();
  const { id } = await params;
  const ref = decodeURIComponent(id);
  const loaded = await loadRecipe(user.id, ref);
  if (!loaded) notFound();
  const recipe = loaded.recipe;
  const today = todayIso();

  let items: DoneItem[] = [];
  let leftovers: { text: string; useBy: string } | null = null;
  if (recipe) {
    const check = await recheck(user.id, recipe, { allowReserved: true, mealId: loaded.plannedMeal?.id });
    const byId = new Map(check.items.map((i) => [i.id, i]));
    const seen = new Set<string>();
    items = recipe.ingredients.flatMap((g) => {
      const i = g.itemId ? byId.get(g.itemId) : undefined;
      if (!i || seen.has(i.id) || i.state === "pantry" || !["ready", "reserved"].includes(i.status)) return [];
      seen.add(i.id);
      const label = [g.quantity, g.name.toLowerCase()].filter(Boolean).join(" ");
      // Leftovers and cooked food are usually finished; whole packs usually are not.
      const defaultChoice: DoneItem["defaultChoice"] = i.state === "leftover" || i.state === "cooked" ? "used" : "some";
      const note =
        i.status === "reserved" && i.reservedForMealId !== loaded.plannedMeal?.id ? "Saved for a planned meal" : i.quantity ? `You had ${i.quantity.replace(/^x/, "")}` : null;
      return [{ id: i.id, label, defaultChoice, note }];
    });
    if (recipe.leftovers) {
      const advice = storageAdvice({ name: recipe.title, state: "leftover", addedDay: today });
      leftovers = {
        text: recipe.leftovers.toLowerCase(),
        useBy: advice?.estimatedUseBy ? formatDay(advice.estimatedUseBy, { weekday: "long" }) : "in 3 days",
      };
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2">
      <ScreenView code="11" />
      <PageHeader back={`/recipe/${ref}`} title="Enjoy your dinner" subtitle={`${loaded.title}. Tell me what happened so your fridge list stays right.`} />
      <DoneForm refId={ref} items={items} leftovers={leftovers} back={`/recipe/${ref}`} />
    </main>
  );
}
