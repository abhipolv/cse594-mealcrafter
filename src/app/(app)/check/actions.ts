"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getItems } from "@/lib/data/items";
import { getProfile, ruleContext } from "@/lib/data/profile";
import { applyAnswer, reviewQuestion } from "@/lib/items";

const AnswerInput = z.object({
  itemId: z.string().uuid(),
  answer: z.enum(["has", "none", "unsure", "mine", "not_mine", "yes", "rename", "not_here", "skip"]),
  newName: z.string().trim().max(80).optional(),
});

export type AnswerValue = z.infer<typeof AnswerInput>["answer"];

export type AnswerResult = { ok: true; checkId: string; label: string } | { ok: false; error: string };

const SNAPSHOT = ["name", "status", "confidence", "mayContain", "contentsKnown"] as const;

function revalidate() {
  revalidatePath("/check");
  revalidatePath("/fridge");
  revalidatePath("/");
}

/** One answer to a review card (G11). Records it in item_checks (N2) and updates the item. */
export async function answerCheck(input: z.input<typeof AnswerInput>): Promise<AnswerResult> {
  const user = await requireUser();
  const parsed = AnswerInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That answer was not understood." };
  const { itemId, answer, newName } = parsed.data;
  if (answer === "rename" && !newName) return { ok: false, error: "Type what it is first." };

  const [item] = await getItems(user.id, undefined, [itemId]);
  if (!item) return { ok: false, error: "That item is gone. Refresh the page." };
  const ctx = ruleContext(await getProfile(user.id));
  // Ask the question again from the database, so a stale or edited page cannot change what was asked.
  const q = reviewQuestion(item, ctx);

  const label =
    answer === "skip"
      ? "Skip for now"
      : answer === "not_mine"
        ? "Not mine"
        : answer === "not_here"
          ? "Not in my fridge"
          : answer === "rename"
            ? `It's ${newName}`
            : (q.answers.find((a) => a.value === answer)?.label ?? answer);

  const patch = answer === "skip" ? {} : applyAnswer(item, ctx, q, answer, newName);
  const before = Object.fromEntries(SNAPSHOT.map((k) => [k, item[k]]));
  const after = { ...before, ...patch };

  const checkId = await db.transaction(async (tx) => {
    if (Object.keys(patch).length) {
      await tx
        .update(schema.items)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(schema.items.id, itemId), eq(schema.items.userId, user.id)));
    }
    const [row] = await tx
      .insert(schema.itemChecks)
      .values({ itemId, userId: user.id, question: q.question, answer: label, before, after })
      .returning({ id: schema.itemChecks.id });
    return row.id;
  });

  revalidate();
  return { ok: true, checkId, label };
}

/** Puts an item back the way it was before an answer (the card's Undo). */
export async function undoCheck(checkId: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(checkId).success) return { ok: false };
  const [check] = await db
    .select()
    .from(schema.itemChecks)
    .where(and(eq(schema.itemChecks.id, checkId), eq(schema.itemChecks.userId, user.id)));
  if (!check?.before) return { ok: false };
  const b = check.before as Record<string, unknown>;
  const Restore = z.object({
    name: z.string(),
    status: z.enum(schema.ITEM_STATUSES),
    confidence: z.enum(schema.CONFIDENCES),
    mayContain: z.array(z.string()),
    contentsKnown: z.boolean(),
  });
  const restore = Restore.safeParse(b);
  if (!restore.success) return { ok: false };
  await db.transaction(async (tx) => {
    await tx
      .update(schema.items)
      .set({ ...restore.data, mayContain: restore.data.mayContain as typeof schema.items.$inferSelect.mayContain, updatedAt: new Date() })
      .where(and(eq(schema.items.id, check.itemId), eq(schema.items.userId, user.id)));
    await tx.insert(schema.itemChecks).values({
      itemId: check.itemId,
      userId: user.id,
      question: check.question,
      answer: "Undo",
      before: check.after,
      after: check.before,
    });
  });
  revalidate();
  return { ok: true };
}
