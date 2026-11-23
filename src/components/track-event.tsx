"use client";
import { useEffect, useRef } from "react";
import { track } from "@/lib/events";

/** Logs one study event when a screen shows a result (e.g. "suggest" on 09). */
export function TrackEvent({ name, screen, props }: { name: string; screen: string; props: Record<string, unknown> }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    track(name, screen, props);
  }, [name, screen, props]);
  return null;
}
