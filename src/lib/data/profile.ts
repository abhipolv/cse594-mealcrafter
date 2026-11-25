import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { RuleContext } from "@/lib/items";

export type Profile = typeof schema.profiles.$inferSelect;

/** The user's profile row, or null before setup has saved anything. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  return row ?? null;
}

/** Creates the profile row if it is missing, then applies `values`. */
export async function saveProfile(userId: string, values: Partial<Omit<Profile, "userId">>) {
  await db
    .insert(schema.profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: schema.profiles.userId, set: values });
}

export function ruleContext(profile: Profile | null): RuleContext {
  return {
    tags: [...new Set((profile?.rules ?? []).map((r) => r.tag))],
    customWords: (profile?.customRules ?? []).map((r) => r.word),
    fridgeShared: profile?.fridgeShared === true,
  };
}
