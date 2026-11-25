import "server-only";
import { db, schema } from "@/lib/db";

/**
 * Study log from server actions, for changes made by a form (a beacon from the
 * page can be lost when the form redirects). Same table and event names as
 * track() in src/lib/events.ts; sessionId is null for these rows.
 */
export async function logEvent(userId: string, name: string, screen: string | null, props: Record<string, unknown> = {}) {
  try {
    await db.insert(schema.events).values({ userId, name, screen, props });
  } catch (err) {
    console.error("logEvent failed", err); // logging must never break the action
  }
}
