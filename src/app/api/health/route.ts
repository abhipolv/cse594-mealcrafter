import { aiMode } from "@/lib/ai";

export function GET() {
  return Response.json({ ok: true, ai: aiMode(), commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local" });
}
