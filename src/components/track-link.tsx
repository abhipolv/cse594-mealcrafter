"use client";
import Link from "next/link";
import { track } from "@/lib/events";

/** A link that logs a "tap" before navigating (rule 5: primary actions). */
export function TrackLink({
  href,
  screen,
  target,
  className,
  children,
  props,
}: {
  href: string;
  screen: string;
  target: string;
  className?: string;
  children: React.ReactNode;
  props?: Record<string, unknown>;
}) {
  return (
    <Link href={href} className={className} onClick={() => track("tap", screen, { target, ...props })}>
      {children}
    </Link>
  );
}
