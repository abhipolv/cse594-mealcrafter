"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/fridge", label: "Fridge", match: (p: string) => p.startsWith("/fridge") },
  { href: "/plan", label: "Plan", match: (p: string) => p.startsWith("/plan") },
  { href: "/profile", label: "Profile", match: (p: string) => p.startsWith("/profile") },
];

// Shown only on the four tab roots, as in the Figma frames.
const ROOTS = new Set(["/", "/fridge", "/plan", "/profile"]);

export function NavBar() {
  const pathname = usePathname();
  if (!ROOTS.has(pathname)) return null;
  return (
    <nav className="sticky bottom-0 mt-auto grid grid-cols-4 border-t border-ink bg-paper pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 py-3 text-[13px] ${active ? "font-semibold text-ink" : "text-ink-2"}`}
          >
            <span className={`block size-6 rounded-md ${active ? "bg-ink" : "bg-line"}`} aria-hidden />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
