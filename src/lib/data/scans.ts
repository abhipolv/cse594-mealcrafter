import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { NewItem } from "@/lib/scan";

export type SaveCounts = { added: number; toCheck: number; unclear: number; updated: number };

/**
 * Saves the items from one scan. Food already on the list (same name) is
 * updated with the new evidence instead of added twice, and keeps the user's
 * earlier answer: something marked "not mine" stays not mine, so it is never
 * asked about again.
 */
export async function saveScanItems(userId: string, scanId: string, items: NewItem[]): Promise<SaveCounts> {
  const counts: SaveCounts = { added: 0, toCheck: 0, unclear: 0, updated: 0 };
  const existing = await db
    .select({ id: schema.items.id, name: schema.items.name, status: schema.items.status })
    .from(schema.items)
    .where(
      and(eq(schema.items.userId, userId), inArray(schema.items.status, ["ready", "needs_check", "reserved", "not_mine", "unclear"])),
    );
  const byName = new Map(existing.map((e) => [e.name.trim().toLowerCase(), e]));

  await db.transaction(async (tx) => {
    for (const item of items) {
      const key = item.name.trim().toLowerCase();
      const match = byName.get(key);
      if (match && (match.status === "unclear") === (item.status === "unclear")) {
        await tx
          .update(schema.items)
          .set({
            scanId,
            evidence: item.evidence,
            ...(item.quantity ? { quantity: item.quantity } : {}),
            updatedAt: new Date(),
          })
          .where(eq(schema.items.id, match.id));
        counts.updated++;
        continue;
      }
      await tx.insert(schema.items).values({ userId, scanId, ...item });
      byName.set(key, { id: "", name: item.name, status: item.status });
      if (item.status === "needs_check") counts.toCheck++;
      else if (item.status === "unclear") counts.unclear++;
      else counts.added++;
    }
    await tx.update(schema.scans).set({ status: "done" }).where(eq(schema.scans.id, scanId));
  });
  return counts;
}
