// Receives the frames from G09 (already resized on the phone), stores them,
// runs the food recognizer on the server (rule 7) and saves the items.
// Returns { scanId } for G10, or { error } with a message to show.
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { readUserId } from "@/lib/auth/session";
import { recognize } from "@/lib/ai";
import { putImage } from "@/lib/media";
import { getProfile, ruleContext } from "@/lib/data/profile";
import { saveScanItems } from "@/lib/data/scans";
import { itemsFromRecognition } from "@/lib/scan";
import { logEvent } from "@/lib/events-server";

export const maxDuration = 120; // a live recognizer call on 12 frames can take a while

const MAX_FRAMES = 12;
const MAX_BYTES = 1_500_000; // per frame
const MAX_TOTAL = 4_000_000; // stays under the hosting limit for one request

const Meta = z.object({
  source: z.enum(["video", "photo", "receipt"]),
  dims: z.array(z.object({ w: z.number().int().positive().max(4096), h: z.number().int().positive().max(4096) })).max(MAX_FRAMES),
});

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  const userId = await readUserId();
  if (!userId) return fail(401, "Log in with your study code first.");

  const form = await request.formData().catch(() => null);
  if (!form) return fail(400, "The upload did not arrive. Try again.");
  const meta = Meta.safeParse(JSON.parse(String(form.get("meta") ?? "{}")));
  if (!meta.success) return fail(400, "The upload was not understood. Try again.");
  const frames = form.getAll("frames").filter((f): f is File => f instanceof File);
  if (frames.length === 0) return fail(400, "No photos arrived. Try again.");
  if (frames.length > MAX_FRAMES || frames.length !== meta.data.dims.length) return fail(400, "Too many photos in one scan.");
  const total = frames.reduce((n, f) => n + f.size, 0);
  if (frames.some((f) => f.size > MAX_BYTES || f.type !== "image/jpeg") || total > MAX_TOTAL) {
    return fail(413, "The photos are too large. Try again.");
  }

  const profile = await getProfile(userId);
  const { source } = meta.data;
  // A shared fridge needs the roommates' agreement before photos of it are analyzed (G08).
  if (source !== "receipt" && profile?.fridgeShared && !profile.fridgeConsentAt) {
    return fail(403, "Confirm your roommates agreed first.");
  }

  const [scan] = await db.insert(schema.scans).values({ userId, source, status: "uploading" }).returning({ id: schema.scans.id });
  const started = Date.now();
  try {
    const buffers = await Promise.all(frames.map(async (f) => Buffer.from(await f.arrayBuffer())));
    const mediaIds: string[] = [];
    for (const [i, data] of buffers.entries()) {
      const storagePath = await putImage(userId, scan.id, `${source === "video" ? "frame" : source}-${i}`, data);
      const [m] = await db
        .insert(schema.media)
        .values({
          userId,
          scanId: scan.id,
          storagePath,
          kind: source === "video" ? "frame" : source,
          width: meta.data.dims[i].w,
          height: meta.data.dims[i].h,
        })
        .returning({ id: schema.media.id });
      mediaIds.push(m.id);
    }

    await db.update(schema.scans).set({ status: "recognizing" }).where(eq(schema.scans.id, scan.id));
    const ctx = ruleContext(profile);
    const { value, model } = await recognize({
      images: buffers.map((data) => ({ data, mediaType: "image/jpeg" as const })),
      source,
      ruleTags: ctx.tags,
    });
    await db.update(schema.scans).set({ model }).where(eq(schema.scans.id, scan.id));
    const counts = await saveScanItems(userId, scan.id, itemsFromRecognition(value, mediaIds, ctx));
    await logEvent(userId, "scan", "G09", {
      phase: "done",
      scanId: scan.id,
      source,
      frames: frames.length,
      ms: Date.now() - started,
      skippedPrivate: value.skipped_private,
      ...counts,
    });
    return Response.json({ scanId: scan.id });
  } catch (err) {
    console.error("scan failed", err);
    await db.update(schema.scans).set({ status: "failed" }).where(eq(schema.scans.id, scan.id));
    await logEvent(userId, "scan", "G09", { phase: "failed", scanId: scan.id, source, frames: frames.length });
    return fail(502, "I couldn't read the photos this time. Try again, or type your food in.");
  }
}
