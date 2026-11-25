import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { readUserId } from "@/lib/auth/session";
import { getImage } from "@/lib/media";

// Serves a stored fridge photo to its owner only. Photos never get public URLs.
export async function GET(_req: Request, ctx: RouteContext<"/api/media/[id]">) {
  const userId = await readUserId();
  if (!userId) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const [row] = await db
    .select({ path: schema.media.storagePath })
    .from(schema.media)
    .where(and(eq(schema.media.id, id), eq(schema.media.userId, userId)));
  const data = row && (await getImage(row.path));
  if (!data) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" },
  });
}
