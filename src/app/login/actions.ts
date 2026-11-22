"use server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { startSession, endSession } from "@/lib/auth/session";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  if (!code) return { error: "Type the code you were given." };
  const [user] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.code, code));
  if (!user) return { error: "That code doesn't match. Check with your study facilitator." };
  await startSession(user.id);
  const [profile] = await db
    .select({ done: schema.profiles.setupCompletedAt })
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, user.id));
  redirect(profile?.done ? "/" : "/setup");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
