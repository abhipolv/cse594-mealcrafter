// Every screen in the app, mapped to its Figma frame, its build track, and the
// Stage 2 planned updates it must include. The screen code is also what the
// study log records (events.screen), so keep codes stable.
//
// Figma file: https://www.figma.com/design/PXwXEtjr9iv5n8oDpzfwau
// Updates refer to the "Planned updates" table in the Stage 2 report (1 to 10).

export const FIGMA_FILE = "PXwXEtjr9iv5n8oDpzfwau";

export type Track = "A setup+profile" | "B scan+check" | "C fridge" | "D meals+plan" | "shell";

export type Screen = {
  code: string;
  title: string;
  route: string;
  figmaNode: string;
  track: Track;
  updates: number[];
  notes?: string;
  tab?: "home" | "fridge" | "plan" | "profile"; // shows the bottom bar with this tab active
};

export const SCREENS: Screen[] = [
  // ---- Track A: first-run setup (no bottom bar) ----
  { code: "G01", title: "Welcome", route: "/setup", figmaNode: "96:960", track: "A setup+profile", updates: [] },
  { code: "G02", title: "Foods you never eat", route: "/setup/never-eat", figmaNode: "96:982", track: "A setup+profile", updates: [5], notes: "'None apply' must wait for Next (E2)." },
  { code: "G03", title: "Rules you follow", route: "/setup/rules", figmaNode: "96:1029", track: "A setup+profile", updates: [5], notes: "Merge the religious and ethical lists; make the often-forgotten reminder clear (E2)." },
  { code: "G04", title: "Budget and time", route: "/setup/budget", figmaNode: "96:1081", track: "A setup+profile", updates: [5], notes: "Buttons must not shift when selected (E2)." },
  { code: "G05", title: "Your kitchen", route: "/setup/kitchen", figmaNode: "96:1141", track: "A setup+profile", updates: [5, 8], notes: "Shared fridge; people you cook for, with their agreement (update 8)." },
  { code: "G06", title: "Your profile (summary)", route: "/setup/summary", figmaNode: "96:1185", track: "A setup+profile", updates: [] },
  { code: "17", title: "Profile", route: "/profile", figmaNode: "4:456", track: "A setup+profile", updates: [5], tab: "profile" },

  // ---- Track B: adding food, recognizer, review cards ----
  { code: "G07", title: "Add food", route: "/add", figmaNode: "96:1219", track: "B scan+check", updates: [5], notes: "Fridge video, photo, receipt, typed. 'Fridge photo' must open the photo capture, not video (E2)." },
  { code: "G08", title: "Consent (shared fridge)", route: "/add/consent", figmaNode: "96:1249", track: "B scan+check", updates: [], notes: "Skipped when the fridge is not shared. Must name the AI provider that receives the photos." },
  { code: "G09", title: "Scan", route: "/add/scan", figmaNode: "96:1273", track: "B scan+check", updates: [], notes: "Capture video or photos; frames resized on the phone; items appear as they are recognized." },
  { code: "G10", title: "Scan results", route: "/add/results", figmaNode: "96:1291", track: "B scan+check", updates: [4], notes: "Finish button must be visible without scrolling past the list (E2)." },
  { code: "G11", title: "Check items (review cards)", route: "/check", figmaNode: "98:987", track: "B scan+check", updates: [1, 4], notes: "One question per card, buttons worded as answers. Distinct confidence levels, fewer cards at once, rule-related first, skip allowed. Same as Task 2 screen 05 (3:134)." },

  // ---- Track C: inventory ----
  { code: "G12", title: "Your fridge", route: "/fridge", figmaNode: "98:1145", track: "C fridge", updates: [3, 4], tab: "fridge", notes: "Use-by date on every item and sorted by it; today's date and time since last scan; rescan nudge when old. Same as 06 (3:240)." },
  { code: "G13", title: "Item detail", route: "/fridge/[itemId]", figmaNode: "98:1225", track: "C fridge", updates: [6], notes: "Storage guideline with its source; link to meals that use the item (update 6). Same as 07 (3:328)." },

  // ---- Track D: meals and plan ----
  { code: "01", title: "Home", route: "/", figmaNode: "3:22", track: "D meals+plan", updates: [6], tab: "home", notes: "Fewer cards competing with 'What can I cook now?'; remaining cards labelled as reminders (update 6)." },
  { code: "08", title: "Cook now", route: "/cook", figmaNode: "3:367", track: "D meals+plan", updates: [] },
  { code: "09", title: "Meal results", route: "/cook/results", figmaNode: "3:407", track: "D meals+plan", updates: [7, 9], notes: "Rule filter runs before display. 'Not shown' note lists filtered meals and why. Can cook with a reserved item and revise that meal (update 7)." },
  { code: "10", title: "Recipe", route: "/recipe/[id]", figmaNode: "3:456", track: "D meals+plan", updates: [9], notes: "Image, optional nutrition, remaining weekly budget (update 9, low)." },
  { code: "11", title: "Did you cook it?", route: "/recipe/[id]/done", figmaNode: "3:570", track: "C fridge", updates: [2], notes: "Ask whether it was cooked as suggested; let the user edit what was used (update 2)." },
  { code: "12", title: "Week plan", route: "/plan", figmaNode: "4:261", track: "D meals+plan", updates: [], tab: "plan" },
  { code: "13", title: "Day sheet", route: "/plan/[day]", figmaNode: "4:318", track: "D meals+plan", updates: [] },
  { code: "14", title: "Skip reason", route: "/plan/[day]/skip", figmaNode: "4:334", track: "D meals+plan", updates: [10], notes: "Say on screen what the reason is used for (update 10)." },
  { code: "15", title: "Replan proposal", route: "/plan/replan", figmaNode: "4:349", track: "D meals+plan", updates: [7] },
  { code: "16", title: "Updated plan", route: "/plan/updated", figmaNode: "4:387", track: "D meals+plan", updates: [] },
];

export function figmaUrl(node: string) {
  return `https://www.figma.com/design/${FIGMA_FILE}?node-id=${node.replace(":", "-")}`;
}

export function screen(code: string): Screen {
  const s = SCREENS.find((x) => x.code === code);
  if (!s) throw new Error(`Unknown screen code ${code}`);
  return s;
}
