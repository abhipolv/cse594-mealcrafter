// Study log. Call track() from client components; it never throws and never
// blocks the UI. Server actions that change data log with logEvent() from
// src/lib/events-server.ts, using the same names. Event names in use (add new ones here so the analysis script
// knows about them):
//   screen_view   { }                         logged by <ScreenView/>
//   tap           { target }                  primary buttons and links
//   check_answer  { itemId, question, answer } review cards (N2)
//   suggest       { minutes, shown, filtered } meal results (N1, N4)
//   cooked        { asSuggested, edited }     after a meal (update 2)
//   meal_dismissed { title, suggestionId }    "Not tonight" on a meal card (09)
//   setup_step    { step, ... }               each setup screen saved (G02 to G06)
//   consent       { answer }                  shared-fridge consent (G08)
//   scan          { phase, source, frames, items, ms } capture, upload, result (G09, G10)
//   item_edit     { itemId, action }          fridge item changed on G13
//   plan_change   { kind, day, option }       skip, move, swap, replan, undo (13 to 16)
//   skip_reason   { day, reason }             answer on 14 (update 10)
//   reminder      { kind, itemId }            a Home reminder acted on (01)
"use client";

const SESSION_KEY = "mc_sid";

function sessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "no-storage";
  }
}

export function track(name: string, screen: string | null, props: Record<string, unknown> = {}) {
  try {
    const body = JSON.stringify({ name, screen, props, sessionId: sessionId(), at: new Date().toISOString() });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    }
  } catch {
    // Logging must never break the app.
  }
}
