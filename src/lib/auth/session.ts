import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const SESSION_COOKIE = "mc_session";
const MAX_AGE_S = 60 * 60 * 24 * 60; // 60 days: log in once for the whole study

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function startSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

export type CurrentUser = { id: string; code: string; displayName: string; role: string };

/** Data Access Layer entry point: every page and route that touches user data calls this. */
export async function requireUser(): Promise<CurrentUser> {
  const id = await readUserId();
  if (!id) redirect("/login");
  const [user] = await db
    .select({
      id: schema.users.id,
      code: schema.users.code,
      displayName: schema.users.displayName,
      role: schema.users.role,
    })
    .from(schema.users)
    .where(eq(schema.users.id, id));
  if (!user) redirect("/login");
  return user;
}
