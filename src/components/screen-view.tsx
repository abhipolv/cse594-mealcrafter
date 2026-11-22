"use client";
import { useEffect } from "react";
import { track } from "@/lib/events";

/** Logs one screen_view per mount. Put it at the top of every screen. */
export function ScreenView({ code }: { code: string }) {
  useEffect(() => {
    track("screen_view", code);
  }, [code]);
  return null;
}
