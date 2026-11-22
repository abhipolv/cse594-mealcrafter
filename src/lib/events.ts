// Study log. Call track() from client components; it never throws and never
// blocks the UI. Event names in use (add new ones here so the analysis script
// knows about them):
//   screen_view   { }                         logged by <ScreenView/>
//   tap           { target }                  primary buttons and links
//   check_answer  { itemId, question, answer } review cards (N2)
//   suggest       { minutes, shown, filtered } meal results (N1, N4)
//   cooked        { asSuggested, edited }     after a meal (update 2)
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
