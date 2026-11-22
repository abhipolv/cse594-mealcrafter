// Seeds the demo persona "Sam" from the Stage 2 prototype: allergic to peanuts
// and tree nuts, shares a fridge, ~$70 a week. Safe to re-run: it replaces
// Sam's data and leaves everyone else alone.
//   pnpm db:seed
import { eq } from "drizzle-orm";
import { db, schema, client } from "./db";

const CODE = "sam-demo";

function day(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function main() {
  await db.delete(schema.users).where(eq(schema.users.code, CODE)); // cascades
  const [sam] = await db
    .insert(schema.users)
    .values({ code: CODE, displayName: "Sam", role: "demo" })
    .returning();

  await db.insert(schema.profiles).values({
    userId: sam.id,
    rules: [
      { tag: "peanuts", kind: "allergy" },
      { tag: "tree_nuts", kind: "allergy" },
    ],
    budgetCents: 7000,
    budgetPeriod: "week",
    usualCookMinutes: 20,
    fridgeShared: true,
    fridgeConsentAt: new Date(),
    cooksFor: 1,
    setupCompletedAt: new Date(),
  });

  const [thu] = await db
    .insert(schema.plannedMeals)
    .values([
      { userId: sam.id, day: day(1), title: "Chicken tacos" },
      { userId: sam.id, day: day(2), title: "Spinach and feta pasta" },
      { userId: sam.id, day: day(3), title: "Leftovers" },
    ])
    .returning()
    .then((rows) => rows.filter((r) => r.title.startsWith("Spinach")));

  const base = { userId: sam.id, contentsKnown: true, confidence: "high" as const, status: "ready" as const };
  await db.insert(schema.items).values([
    { ...base, name: "Cooked rice", quantity: "about 2 cups", state: "leftover", useBy: day(2), evidence: { text: "Told the app on Sunday" } },
    { ...base, name: "Eggs", quantity: "x7", mayContain: ["egg"], useBy: day(21), evidence: { text: "EGGS LG 12CT 3.29" } },
    { ...base, name: "Bell peppers", quantity: "x2", useBy: day(5), evidence: { where: "left drawer" } },
    { ...base, name: "Shredded cheddar", mayContain: ["milk"], useBy: day(14), evidence: { text: "SHRD CHDR 8OZ 3.49" } },
    { ...base, name: "Flour tortillas", state: "pantry", mayContain: ["wheat_gluten"], useBy: day(10) },
    { ...base, name: "Soy sauce", state: "pantry", mayContain: ["soy", "wheat_gluten"], evidence: { text: "Label read: no nuts listed" } },
    { ...base, name: "Spinach", quantity: "1 bag", status: "reserved", reservedForMealId: thu.id, useBy: day(3) },
    { ...base, name: "Feta", mayContain: ["milk"], status: "reserved", reservedForMealId: thu.id, useBy: day(9) },
    { ...base, name: "Chicken thighs", quantity: "1.5 lb", state: "frozen" },
    { ...base, name: "Milk, opened", mayContain: ["milk"], useBy: day(-1), checkReason: "Opened 8 days ago, past the typical 7. Check it before using." },
    {
      userId: sam.id, name: "Basil pesto", status: "needs_check", confidence: "medium", mayContain: ["tree_nuts"],
      contentsKnown: false, evidence: { text: "...basil, olive oil, cashews, pine nuts...", where: "top shelf" },
      checkReason: "Pesto often has nuts. Does this one?",
    },
    {
      userId: sam.id, name: "Granola", state: "pantry", status: "needs_check", confidence: "medium", mayContain: ["tree_nuts"],
      contentsKnown: false, evidence: { text: "KIND GRANOLA ALMND 4.99" },
      checkReason: "The receipt line may say almond. Does it have tree nuts?",
    },
    {
      userId: sam.id, name: "Greek yogurt", status: "needs_check", confidence: "medium", mayContain: ["milk"],
      contentsKnown: true, evidence: { where: "top shelf" }, checkReason: "Shared fridge: is this yours?",
    },
    {
      userId: sam.id, name: "Glass container, brown food", state: "leftover", status: "needs_check", confidence: "cant_see",
      contentsKnown: false, evidence: { where: "bottom shelf" }, checkReason: "I can't tell what this is. What's in it?",
    },
  ]);

  console.log(`Seeded ${CODE}. Log in with the code "${CODE}".`);
}

main().finally(() => client.end());
