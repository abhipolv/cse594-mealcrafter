// Optimistic login check. The real check is requireUser() in src/lib/auth/session.ts;
// this only saves a round trip by sending people without a cookie to /login.
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/api/health"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
  if (request.cookies.has("mc_session")) return;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Log in with your study code first." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
