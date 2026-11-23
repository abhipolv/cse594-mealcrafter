import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { dayOf } from "@/lib/time";
import type { ItemLike } from "@/lib/items";
import type { Evidence } from "@/lib/db/schema";

export type ItemView = ItemLike & {
  evidence: Evidence;
  addedAt: Date;
  scanId: string | null;
  scanSource: "video" | "photo" | "receipt" | "typed" | null;
  scanAt: Date | null;
  media: { id: string; width: number; height: number } | null;
  reservedForMealId: string | null;
};

type Status = (typeof schema.ITEM_STATUSES)[number];

/** The user's items with their scan and photo, ready for the shared item logic. */
export async function getItems(userId: string, statuses?: Status[], ids?: string[]): Promise<ItemView[]> {
  const conds = [eq(schema.items.userId, userId)];
  if (statuses) conds.push(inArray(schema.items.status, statuses));
  if (ids) conds.push(inArray(schema.items.id, ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]));
  const rows = await db
    .select({
      item: schema.items,
      scanSource: schema.scans.source,
      scanAt: schema.scans.createdAt,
    })
    .from(schema.items)
    .leftJoin(schema.scans, eq(schema.items.scanId, schema.scans.id))
    .where(and(...conds))
    .orderBy(desc(schema.items.addedAt));

  const mediaIds = [...new Set(rows.map((r) => r.item.evidence.mediaId).filter((x): x is string => !!x))];
  const media = mediaIds.length
    ? await db
        .select({ id: schema.media.id, width: schema.media.width, height: schema.media.height })
        .from(schema.media)
        .where(and(eq(schema.media.userId, userId), inArray(schema.media.id, mediaIds)))
    : [];
  const mediaById = new Map(media.map((m) => [m.id, { id: m.id, width: m.width ?? 1, height: m.height ?? 1 }]));

  return rows.map(({ item, scanSource, scanAt }) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    state: item.state,
    status: item.status,
    confidence: item.confidence,
    mayContain: item.mayContain,
    contentsKnown: item.contentsKnown,
    checkReason: item.checkReason,
    useBy: item.useBy,
    openedAt: item.openedAt,
    addedDay: dayOf(item.addedAt),
    evidence: item.evidence,
    addedAt: item.addedAt,
    scanId: item.scanId,
    scanSource,
    scanAt,
    media: item.evidence.mediaId ? (mediaById.get(item.evidence.mediaId) ?? null) : null,
    reservedForMealId: item.reservedForMealId,
  }));
}

/** When the fridge list last changed from a scan or typed entry: the newest item or scan. */
export async function lastUpdate(userId: string): Promise<{ at: Date; source: ItemView["scanSource"] } | null> {
  const [scan] = await db
    .select({ at: schema.scans.createdAt, source: schema.scans.source })
    .from(schema.scans)
    .where(and(eq(schema.scans.userId, userId), eq(schema.scans.status, "done")))
    .orderBy(desc(schema.scans.createdAt))
    .limit(1);
  const [item] = await db
    .select({ at: schema.items.addedAt })
    .from(schema.items)
    .where(eq(schema.items.userId, userId))
    .orderBy(desc(schema.items.addedAt))
    .limit(1);
  if (scan && (!item || scan.at >= item.at)) return scan;
  return item ? { at: item.at, source: null } : null;
}
