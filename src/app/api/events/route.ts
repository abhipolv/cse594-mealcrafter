import { z } from "zod";
import { db, schema } from "@/lib/db";
import { readUserId } from "@/lib/auth/session";

const EventSchema = z.object({
  name: z.string().min(1).max(64),
  screen: z.string().max(16).nullable(),
  props: z.record(z.string(), z.unknown()).default({}),
  sessionId: z.string().max(64),
  at: z.string().datetime(),
});

export async function POST(request: Request) {
  const userId = await readUserId();
  if (!userId) return new Response(null, { status: 401 });
  const parsed = EventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const e = parsed.data;
  await db.insert(schema.events).values({
    userId,
    sessionId: e.sessionId,
    name: e.name,
    screen: e.screen,
    props: e.props,
    at: new Date(e.at),
  });
  return new Response(null, { status: 204 });
}
