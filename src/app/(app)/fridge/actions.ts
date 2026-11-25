"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { logEvent } from "@/lib/events-server";
import { today } from "@/lib/time";
import { isPlainFood } from "@/lib/foodkeeper";
import { getProfile, ruleContext } from "@/lib/data/profile";

const Id = z.string().uuid();

async function ownItem(userId: string, id: string) {
  const [row] = await db
    .select({ id: schema.items.id, status: schema.items.status, name: schema.items.name })
    .from(schema.items)
    .where(and(eq(schema.items.id, id), eq(schema.items.userId, userId)));
  return row ?? null;
}

function refresh(id?: string) {
  revalidatePath("/fridge");
  if (id) revalidatePath(`/fridge/${id}`);
  revalidatePath("/");
  revalidatePath("/check");
}

/** G13 "Opened?" chips. Opening changes the FoodKeeper time that applies. */
export async function setOpened(formData: FormData) {
  const user = await requireUser();
  const id = Id.parse(formData.get("id"));
  const opened = formData.get("opened") === "yes";
  if (!(await ownItem(user.id, id))) return;
  await db
    .update(schema.items)
    .set({ openedAt: opened ? today() : null, updatedAt: new Date() })
    .where(and(eq(schema.items.id, id), eq(schema.items.userId, user.id)));
  await logEvent(user.id, "item_edit", "G13", { itemId: id, action: opened ? "opened" : "sealed" });
  refresh(id);
}

const EditInput = z.object({
  id: Id,
  name: z.string().trim().min(1, "Give it a name.").max(80),
  quantity: z.string().trim().max(40),
  state: z.enum(schema.ITEM_STATES),
  useBy: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
});

export type EditState = { error?: string; saved?: boolean };

/** G13 Edit. A new name means the contents are no longer settled, so rules are asked again. */
export async function editItem(_prev: EditState, formData: FormData): Promise<EditState> {
  const user = await requireUser();
  const parsed = EditInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const { id, name, quantity, state, useBy } = parsed.data;
  const [item] = await db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.id, id), eq(schema.items.userId, user.id)));
  if (!item) return { error: "That item is gone." };
  const renamed = name !== item.name;
  const ctx = ruleContext(await getProfile(user.id));
  const plain = isPlainFood(name, state);
  const mustCheck = renamed && !plain && (ctx.tags.length > 0 || ctx.customWords.length > 0);
  await db
    .update(schema.items)
    .set({
      name,
      quantity: quantity || null,
      state,
      useBy: useBy || null,
      updatedAt: new Date(),
      // A new name settles what it is but not what is in it, unless it is a plain
      // food; with rules, the review card asks again before it goes into meals.
      ...(renamed
        ? {
            confidence: "high" as const,
            contentsKnown: plain,
            status: mustCheck && item.status === "ready" ? ("needs_check" as const) : item.status,
          }
        : {}),
    })
    .where(and(eq(schema.items.id, id), eq(schema.items.userId, user.id)));
  await db.insert(schema.itemChecks).values({
    itemId: id,
    userId: user.id,
    question: "Edit item",
    answer: "Saved edit",
    before: { name: item.name, quantity: item.quantity, state: item.state, useBy: item.useBy },
    after: { name, quantity: quantity || null, state, useBy: useBy || null },
  });
  await logEvent(user.id, "item_edit", "G13", { itemId: id, action: "edit", renamed });
  refresh(id);
  return { saved: true };
}

const StatusInput = z.object({ id: Id, to: z.enum(["used", "not_mine", "rejected", "thaw"]) });

/** G13 Used up / Not mine / Remove, and "Move to the fridge" for frozen food (01 reminder). */
export async function changeItem(formData: FormData) {
  const user = await requireUser();
  const { id, to } = StatusInput.parse({ id: formData.get("id"), to: formData.get("to") });
  const item = await ownItem(user.id, id);
  if (!item) redirect("/fridge");
  const screen = String(formData.get("screen") ?? "G13");
  if (to === "thaw") {
    // Thawed food keeps the fridge time from today, so the use-by date is re-estimated.
    await db
      .update(schema.items)
      .set({ state: "raw", useBy: null, addedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.items.id, id), eq(schema.items.userId, user.id)));
    await logEvent(user.id, screen === "01" ? "reminder" : "item_edit", screen, { itemId: id, action: "thaw", kind: "thaw" });
    refresh(id);
    return;
  }
  await db
    .update(schema.items)
    .set({ status: to, reservedForMealId: null, updatedAt: new Date() })
    .where(and(eq(schema.items.id, id), eq(schema.items.userId, user.id)));
  await logEvent(user.id, "item_edit", screen, { itemId: id, action: to });
  refresh(id);
  redirect("/fridge");
}
