// 10 Recipe. Figma 3:456. Track D. Checked again against today's rules and
// fridge before it can be cooked (N1). Update 9: remaining weekly budget and
// optional nutrition (recipe images are not available from the suggester).
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { budgetLeft, loadRecipe, recheck } from "@/lib/data/recipes";
import { dollars, fitsText, humanizeReason } from "@/lib/rules-text";
import { addDays, formatDay, relativeDay, today as todayIso } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { TrackLink } from "@/components/track-link";
import { Icon } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { planMeal } from "../../plan/actions";

export default async function RecipePage({ params }: PageProps<"/recipe/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const loaded = await loadRecipe(user.id, decodeURIComponent(id));
  if (!loaded) notFound();
  const today = todayIso();
  const recipe = loaded.recipe;

  if (!recipe) {
    const day = loaded.plannedMeal?.day ?? today;
    return (
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-8">
        <ScreenView code="10" />
        <PageHeader back={loaded.back} title={loaded.title} subtitle={`Planned for ${formatDay(day, { weekday: "long" })}.`} />
        <p className="note">No recipe is saved for this meal. It was planned without one.</p>
        <Link href={`/cook?for=${day}`} className="btn-primary">
          Find a recipe for {formatDay(day, { weekday: "long" })}
        </Link>
        <Link href={`/recipe/${loaded.ref}/done`} className="btn">
          I cooked it
        </Link>
      </main>
    );
  }

  const check = await recheck(user.id, recipe, { allowReserved: loaded.allowReserved, mealId: loaded.plannedMeal?.id });
  const budget = await budgetLeft(user.id, check.profile);
  const byId = new Map(check.items.map((i) => [i.id, i]));
  const fits = fitsText(check.ctx.tags, check.ctx.customWords);
  const labels = recipe.ingredients
    .map((g) => (g.itemId ? byId.get(g.itemId) : undefined))
    .filter((i) => !!i && i.contentsKnown && !!i.evidence.text && /label|no .* listed/i.test(i.evidence.text ?? ""))
    .map((i) => `${i!.name} label checked: ${i!.evidence.text!.replace(/^Label read:\s*/i, "")}.`);
  const savedItems = recipe.ingredients
    .map((g) => (g.itemId ? byId.get(g.itemId) : undefined))
    .filter((i) => !!i && i.status === "reserved" && i.reservedForMealId !== loaded.plannedMeal?.id);
  const where = (itemId?: string) => {
    const i = itemId ? byId.get(itemId) : undefined;
    if (!i) return { text: "To buy", buy: true };
    if (i.status === "reserved" && i.reservedForMealId !== loaded.plannedMeal?.id) return { text: "Saved for a plan", buy: false };
    if (i.state === "pantry") return { text: "In pantry", buy: false };
    if (i.state === "frozen") return { text: "Frozen", buy: false };
    return { text: "In fridge", buy: false };
  };
  const extra = recipe.extraCostCents ?? 0;
  const servings = `${recipe.servings} ${recipe.servings === 1 ? "serving" : "servings"}`;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2">
      <ScreenView code="10" />
      <PageHeader back={loaded.back} title={recipe.title} />
      <div className="-mt-1 flex flex-wrap gap-2">
        <span className="tag">
          <Icon name="clock" size={14} />
          {recipe.minutes} min
        </span>
        <span className="tag">
          <Icon name="pan" size={14} />
          {recipe.pans} {recipe.pans === 1 ? "pan" : "pans"}
        </span>
        <span className="tag">{recipe.leftovers ?? servings}</span>
      </div>

      {check.allowed ? (
        <p className="note flex items-start gap-2">
          <Icon name="check" size={20} className="mt-px shrink-0" />
          <span>
            {fits ? `Fits your profile: ${fits.charAt(0).toLowerCase()}${fits.slice(1)}.` : "Your profile has no food rules."}
            {labels.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </span>
        </p>
      ) : (
        <section role="alert" className="card-check flex flex-col gap-1.5">
          <h2 className="flex items-center gap-2 text-[16px] font-semibold">
            <Icon name="alert" size={20} />
            This meal no longer fits
          </h2>
          <p className="text-[14px] text-ink-2">Your fridge or rules changed since I suggested it:</p>
          <ul className="text-[14px]">
            {check.reasons.map((r) => (
              <li key={r}>- {humanizeReason(r)}</li>
            ))}
          </ul>
          <Link href="/cook" className="mt-1 font-semibold">
            Find another meal &gt;
          </Link>
        </section>
      )}

      <section className="card flex flex-col gap-2" aria-labelledby="ingredients">
        <h2 id="ingredients" className="text-[14px] font-semibold text-ink-2">
          Ingredients ({servings})
        </h2>
        <ul className="flex flex-col">
          {recipe.ingredients.map((g, i) => {
            const w = where(g.itemId);
            return (
              <li key={i} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0">
                <span className="text-[15px]">{[g.quantity, g.name.toLowerCase()].filter(Boolean).join(" ")}</span>
                <span className={w.buy ? "chip-maize shrink-0 !text-[12px]" : "shrink-0 text-[13px] font-medium text-ink-2"}>{w.text}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card flex flex-col gap-1.5" aria-labelledby="cost">
        <h2 id="cost" className="text-[14px] font-semibold text-ink-2">
          Cost
        </h2>
        <p className="text-[15px] leading-snug">
          {extra > 0 ? `About ${dollars(extra)} for what you need to buy.` : "Nothing to buy: it uses food you have."}
        </p>
        {budget && (
          <p className="text-[15px] leading-snug">
            Left this week: {dollars(Math.max(0, budget.left - extra))} of {dollars(budget.perWeek)}
            {extra > 0 ? " after this meal." : "."}
          </p>
        )}
        {recipe.nutrition && (recipe.nutrition.kcal || recipe.nutrition.proteinG) ? (
          <>
            <h3 className="mt-1 text-[14px] font-semibold text-ink-2">Nutrition</h3>
            <p className="text-[15px]">
              About {[recipe.nutrition.kcal && `${recipe.nutrition.kcal} kcal`, recipe.nutrition.proteinG && `${recipe.nutrition.proteinG} g protein`].filter(Boolean).join(" and ")} a serving.
            </p>
          </>
        ) : null}
      </section>

      {savedItems.length > 0 && (
        <p className="note flex items-start gap-2">
          <Icon name="info" size={20} className="mt-px shrink-0" />
          Uses {savedItems.map((s) => s!.name.toLowerCase()).join(" and ")}, saved for a planned meal. After cooking, I will help you change that meal.
        </p>
      )}

      <section className="card flex flex-col gap-2" aria-labelledby="steps">
        <h2 id="steps" className="text-[14px] font-semibold text-ink-2">
          Steps
        </h2>
        <ol className="flex flex-col gap-3">
          {recipe.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-snug">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-semibold text-paper">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-[13px] text-ink-2">I can&apos;t tell if food is safe. Check each item before cooking.</p>

      {!loaded.plannedMeal && check.allowed && (
        <details className="card group">
          <summary className="flex min-h-[28px] cursor-pointer list-none items-center justify-between font-semibold">
            Plan it for another day
            <Icon name="chevron-right" size={18} className="transition-transform group-open:rotate-90" />
          </summary>
          <form action={planMeal} className="mt-3 grid grid-cols-4 gap-2">
            <input type="hidden" name="ref" value={loaded.ref} />
            {days.map((d) => (
              <SubmitButton key={d} name="day" value={d} className="chip !px-0 text-[14px]" pending="...">
                {d === today ? "Today" : relativeDay(d, today) === "tomorrow" ? "Tmrw" : formatDay(d, { weekday: "short" })}
              </SubmitButton>
            ))}
          </form>
        </details>
      )}

      <div className="action-bar mt-auto">
        {check.allowed ? (
          <TrackLink href={`/recipe/${loaded.ref}/done`} screen="10" target="cooked_this" className="btn-primary w-full">
            I cooked this
          </TrackLink>
        ) : (
          <Link href="/cook" className="btn-primary w-full">
            Find another meal
          </Link>
        )}
      </div>
    </main>
  );
}
