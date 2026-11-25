"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

const TABS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "Home", icon: "home", match: (p) => p === "/" || p.startsWith("/cook") || p.startsWith("/recipe") },
  { href: "/fridge", label: "Fridge", icon: "fridge", match: (p) => p.startsWith("/fridge") || p.startsWith("/check") },
  { href: "/plan", label: "Plan", icon: "calendar", match: (p) => p.startsWith("/plan") },
  { href: "/profile", label: "Profile", icon: "user", match: (p) => p.startsWith("/profile") },
];

// As in the Figma frames: the tab bar shows on the app's screens but not
// during first-run setup or while adding food, which are step-by-step flows.
const HIDDEN = ["/setup", "/add"];

export function NavBar() {
  const pathname = usePathname();
  if (HIDDEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-20 mt-auto grid grid-cols-4 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[12px] transition-colors active:bg-fill ${active ? "font-semibold text-ink" : "text-ink-2"}`}
          >
            <span
              className={`grid size-8 place-items-center rounded-[10px] transition-colors ${active ? "bg-ink text-paper" : "text-ink-2"}`}
            >
              <Icon name={t.icon} size={20} />
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
