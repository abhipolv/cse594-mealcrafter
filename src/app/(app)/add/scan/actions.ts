"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getProfile, ruleContext } from "@/lib/data/profile";
import { saveScanItems } from "@/lib/data/scans";
import { itemsFromTyped, parseTyped } from "@/lib/scan";
import { logEvent } from "@/lib/events-server";

export type TypedState = { error?: string };

const Input = z.object({
  text: z.string().max(4000),
  place: z.enum(["raw", "frozen", "pantry"]),
});

/** G09 "Type it in": no model involved. Plain foods are ready; mixtures under rules get a review card. */
export async function addTyped(_prev: TypedState, formData: FormData): Promise<TypedState> {
  const user = await requireUser();
  const parsed = Input.safeParse({ text: formData.get("text") ?? "", place: formData.get("place") ?? "raw" });
  if (!parsed.success) return { error: "That list is too long. Add it in two parts." };
  const lines = parseTyped(parsed.data.text);
  if (lines.length === 0) return { error: "Type at least one food, one per line." };

  const ctx = ruleContext(await getProfile(user.id));
  const [scan] = await db
    .insert(schema.scans)
    .values({ userId: user.id, source: "typed", status: "recognizing", model: "typed" })
    .returning({ id: schema.scans.id });
  const counts = await saveScanItems(user.id, scan.id, itemsFromTyped(lines, parsed.data.place, ctx));
  await logEvent(user.id, "scan", "G09", { phase: "done", scanId: scan.id, source: "typed", lines: lines.length, ...counts });
  redirect(`/add/results?scan=${scan.id}`);
}
