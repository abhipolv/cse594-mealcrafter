# MealCrafter: notes for coding agents

MealCrafter is a phone-first web app for CSE 594 (Human-AI Interaction, Fall 2026). It keeps track of what is in a student's fridge from a video, photo, receipt or typed entry, asks the user to check uncertain items, and suggests meals they can cook now within their food rules. Real participants use it in a study during the week of Dec 1, so correctness and the study log matter more than polish. Everything the study needs is merged by Sunday, Nov 29.

The backend parts are done: database, study-code login, the AI layer, the rule filter, the study log and deploys. Most screens are still placeholders. Your job is usually to build one screen from its Figma frame and connect it to those parts.

## The team and what you can use

Four students (Abhi, Omer, Ahmad, Jeff) each own one track of screens and each work with their own coding agent. Your human is one of them; ask them when this file does not answer something.

| Resource | Who has access | How you use it |
|---|---|---|
| GitHub repo (public) | Everyone, write access | Branches, PRs, issues. Each screen has an issue (labels `track-A` to `track-D`) with its Figma link, the Stage 2 updates and a "done when" checklist. Work from the issue. |
| Figma file | Link in `src/lib/screens.ts` | Build from the frame (`figmaNode`). With the Figma MCP tools, fetch the frame's screenshot and design context first. Without them, ask your human for a screenshot. Never edit the Figma file. |
| Local Postgres (Docker) | Everyone | `pnpm setup` creates it with the demo persona Sam (code `sam-demo`). Do all development and testing here. |
| Supabase (production database and photo storage) | Team members, dashboard only | Do not connect to it, query it or migrate it. Production secrets exist only on Abhi's machine; do not ask for them or create `.env.production.local`. Merging to `main` runs production migrations automatically. |
| Vercel (hosting) | Abhi only | Not needed. Each PR gets a preview link from CI, and merging to `main` deploys the live site. |
| AI models (OpenRouter) | Live site only | Use `AI_MODE=mock` (the default). Do not add API keys or call a model from your machine. |

Coordination (owners, decisions, schedule) lives in the team's Stage 3 planner doc; your human has the link. The setup guide for humans is in the README.

## Sources of truth

- **Design:** the Figma frame for the screen, then the `updates` and `notes` for it in `src/lib/screens.ts`, which come from the Stage 2 report's planned updates (1 to 10). Where the frame and the notes disagree, the notes win.
- **Requirements:** F1 to F8 and N1 to N6 from the Stage 1 report. The ones that constrain code are under "Rules that must hold".

## Commands

```bash
pnpm install
pnpm setup                   # once: .env.local, local Postgres in Docker (port 54329), migrations, demo data
pnpm db:up                   # later sessions: start the database again after a reboot
pnpm dev                     # http://localhost:3000, log in with sam-demo
pnpm check                   # lint + typecheck + unit tests; run before every PR
pnpm test:e2e                # Playwright smoke test (needs `pnpm build` and a seeded DB)
pnpm user:list               # login codes in the local database
```

## Layout

- `src/app/(app)/...`: one folder per screen; the route for each screen code is in `src/lib/screens.ts`. Unbuilt screens render `<ScreenStub code="..."/>`; replace the stub when you build the screen. `src/app/(app)/page.tsx` (Home) is the reference for a finished screen.
- `src/lib/data/<screen>.ts`: server-side queries for a screen (see `home.ts`). Server actions go in an `actions.ts` next to the page (see `src/app/login/`).
- `src/lib/db/schema.ts`: the data model shared by all tracks. Changing it needs `pnpm db:generate` and a committed migration in `drizzle/`; CI fails otherwise.
- `src/lib/ai/`: the **food recognizer** and **meal suggester**. `types.ts` holds the contracts, `mock.ts` the recorded responses, `anthropic.ts` the live calls. Screens call `recognize()` from `src/lib/ai/index.ts` and `suggestMeals()` from `src/lib/meals.ts`, never the SDK.
- `src/lib/rules/`: the **rule filter** (plain code, no AI) and the rule vocabulary.
- `src/lib/auth/session.ts`: call `requireUser()` in every page, server action and route handler that touches user data.
- `src/lib/events.ts` and `<ScreenView/>`: the study log.
- `src/lib/time.ts`: dates in Ann Arbor time.

## Rules that must hold

1. **Get meals only through `suggestMeals()`** in `src/lib/meals.ts`. It runs the rule filter and records what it removed in `suggestions.filteredOut`. This is how we meet N1 (zero rule violations). Lint blocks importing the unfiltered suggester or the Anthropic SDK anywhere else; do not work around it. New code that turns model output into meals (replanning, recipes) goes through `applyRuleFilter()` the same way.
2. **Items with status other than `ready` never go into meals.** Unchecked, `not_mine`, `unclear` and `rejected` items are excluded (F2, F3, N3).
3. **The app never says food is safe to eat or not spoiled.** It shows the basis (age, storage guideline and source) and asks the user to check (N1).
4. **Each item shown from a scan has its evidence** (photo crop or receipt text) and a confidence level (N2).
5. **Log the study events.** Put `<ScreenView code="..."/>` on every screen, and call `track()` for primary actions, review-card answers (`check_answer`) and meal results. Event names are listed in `src/lib/events.ts`; add new ones there. Keep screen codes unchanged; the analysis depends on them.
6. **Privacy:** never commit photos, videos, receipts, participant data, login codes from production or keys. `.gitignore` blocks common media types; do not override it. Do not describe or store medication or other private items from scans (N6).
7. **Model calls happen only on the server** and only for a logged-in user.
8. **Dates use `src/lib/time.ts`** (`today()`, `addDays()`, `formatDay()`). The server runs in UTC, so `new Date().toISOString()` gives tomorrow's date every evening.

## Ground rules for agents

- **Stay in your track.** Edit the screens in your issue and files only they use. Shared files need a line in the PR description saying why: `src/lib/db/schema.ts`, `src/lib/meals.ts`, `src/lib/rules/`, `src/lib/ai/`, `src/lib/screens.ts`, `src/app/globals.css`, `src/components/`, `AGENTS.md`.
- **Ask your human before** adding a dependency, changing the schema, touching another track's screens, or changing `.github/`, `vercel.json`, `eslint.config.mjs` or `drizzle/` by hand.
- **Never** push to `main` (it is protected), force-push a shared branch, merge someone else's PR, disable a lint rule or test to get green, or run anything against production.
- **Do not invent data.** Screens read the logged-in user's rows; no hard-coded Sam data, no fake loading states that pretend to call a model. If the data a screen needs is missing from the schema, say so in the PR instead of faking it.
- **Leave the tree clean:** no stray scripts, logs, screenshots or `.env` files in the commit.

## Code style

- TypeScript, strict. No `any`; validate form and request input with `zod`.
- Server Components by default. Add `"use client"` only to the small component that needs state or browser APIs.
- Start each screen file with a one-line comment: `// G11 Check items. Figma 98:987. Track B.`
- File names in kebab-case (`review-card.tsx`); components in PascalCase; one component per file unless it is a small helper used only there.
- Style with Tailwind and the tokens in `src/app/globals.css` (`text-ink`, `text-ink-2`, `border-line`, `bg-fill`, `card`, `card-check`, `btn`, `btn-primary`, `chip-maize`). No new colors, fonts or UI libraries.
- Put logic that can be tested (sorting, grouping, date math) in plain functions with a `*.test.ts` next to them.
- Keep comments for why, not what.

## Look and copy

- Monochrome wireframe style from the Stage 2 Figma file: ink on white, gray for secondary text, 1.5px ink borders, dashed border (`card-check`) for anything waiting on the user's check, Michigan Maize only as a fill behind ink text.
- Phone first: design at 390px wide, touch targets at least 44px, page padding `px-5`.
- UI text uses plain keyboard characters (no curly quotes, em dashes, arrows or bullet glyphs; use `>`, `-`, `...`). Short, concrete sentences in sentence case. Buttons say what happens ("Save rules", not "Submit"). Review-card buttons are worded as answers ("Has tree nuts", "No tree nuts").

## Workflow

1. Pick up the issue for your screen and branch from `main`: `a/g02-never-eat`, `b/g11-check-items`.
2. Build, then run `pnpm check` and click through the screen at phone width, logged in as `sam-demo`.
3. Commit with short, imperative messages ("Build the G02 never-eat screen").
4. Open a PR titled with the track and screen (`[B] G11 Check items`), fill in the template, and write `Closes #<issue>` in the body.
5. CI must pass. Open the preview link that CI posts on the PR on a phone. Your human merges their own PR once it is green; no review is required.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
