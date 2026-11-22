# MealCrafter: notes for coding agents

MealCrafter is a phone-first web app for CSE 594 (Human-AI Interaction, Fall 2026). It keeps track of what is in a student's fridge from a video, photo, receipt or typed entry, asks the user to check uncertain items, and suggests meals they can cook now within their food rules. It is the final-stage working system; real participants will use it in a study (week of Dec 1), so correctness and the study log matter more than polish.

## Sources of truth

- **Design:** the Figma file https://www.figma.com/design/PXwXEtjr9iv5n8oDpzfwau. Every screen's frame is listed in `src/lib/screens.ts` (`figmaNode`). Build from the frame, then apply the Stage 2 updates the registry lists for it. If you have the Figma MCP tools, fetch the frame's screenshot before building a screen.
- **What to change from the prototype:** the `updates` and `notes` fields in `src/lib/screens.ts`, which come from the Stage 2 report's planned updates (1 to 10).
- **Requirements:** F1 to F8 and N1 to N6 from the Stage 1 report. The ones that constrain code are listed under "Rules that must hold" below.

## Commands

```bash
pnpm install
cp .env.example .env.local   # then set SESSION_SECRET (openssl rand -base64 32)
pnpm db:up                   # local Postgres in Docker (port 54329)
pnpm db:migrate && pnpm db:seed
pnpm dev                     # log in with the code sam-demo
pnpm check                   # lint + typecheck + unit tests; run before every PR
pnpm test:e2e                # Playwright smoke test (needs `pnpm build` and a seeded DB)
```

`AI_MODE=mock` (the default) returns recorded responses from `src/lib/ai/mock.ts`, so you never need an API key. Only the deployed app and the model comparison use `AI_MODE=live`.

## Layout

- `src/app/(app)/...`: one folder per screen; the route for each screen code is in `src/lib/screens.ts`. Unbuilt screens render `<ScreenStub code="..."/>`; replace the stub when you build the screen.
- `src/lib/db/schema.ts`: the data model shared by all tracks. Changing it needs `pnpm db:generate` and a committed migration in `drizzle/`; CI fails otherwise. Say "schema change" in the PR title.
- `src/lib/ai/`: the **food recognizer** and **meal suggester**. `types.ts` holds the contracts, `mock.ts` the recorded responses, `anthropic.ts` the live calls. Screens call `recognize()` and `suggest()` from `src/lib/ai/index.ts`, never the SDK directly.
- `src/lib/rules/`: the **rule filter** (plain code, no AI) and the rule vocabulary.
- `src/lib/auth/session.ts`: login by study code. Call `requireUser()` in every page, server action and route handler that touches user data.
- `src/lib/events.ts` and `<ScreenView/>`: the study log.

## Rules that must hold

1. **Every meal shown to a user has passed `checkMeal()`** in `src/lib/rules/filter.ts`. Store what it removed in `suggestions.filteredOut`. This is how we meet N1 (zero rule violations). Never bypass it, never let a model decide the outcome.
2. **Items with status other than `ready` never go into meals.** Unchecked, `not_mine`, `unclear` and `rejected` items are excluded (F2, F3, N3).
3. **The app never says food is safe to eat or not spoiled.** It shows the basis (age, storage guideline and source) and asks the user to check (N1).
4. **Each item shown from a scan has its evidence** (photo crop or receipt text) and a confidence level (N2).
5. **Log the study events.** Put `<ScreenView code="..."/>` on every screen, and call `track()` for primary actions, review-card answers (`check_answer`) and meal results. Event names are listed in `src/lib/events.ts`; add new ones there.
6. **Privacy:** never commit photos, videos, receipts, participant data or keys; `.gitignore` blocks common media types, do not override it. Do not describe or store medication or other private items from scans (N6).
7. **Model calls happen only on the server** and only for a logged-in user.

## Look and copy

- Monochrome wireframe style from the Stage 2 Figma file: ink on white, gray for secondary text, 1.5px ink borders, dashed border (`card-check`) for anything waiting on the user's check, Michigan Maize (`chip-maize`) only as a fill behind ink text. Tokens and utilities are in `src/app/globals.css`; do not add colors.
- Phone first: design at 390px wide, touch targets at least 44px.
- UI text uses plain keyboard characters (no curly quotes, em dashes, arrows or bullet glyphs; use `>`, `-`, `...`). Short, concrete wording; review-card buttons are worded as answers ("Has tree nuts", "No tree nuts").

## Workflow

- Branch from `main`, one issue or screen per PR, keep PRs small. Prefix the PR title with the track: `[A]`, `[B]`, `[C]`, `[D]`, or `[infra]`.
- CI (lint, typecheck, unit tests, migrations, build, smoke test) must pass before merge. Vercel posts a preview link on each PR; check your screens there on a phone.
- Tracks: A setup + profile, B scan + check, C fridge + after-meal, D meals + plan. See `src/lib/screens.ts` for which screen belongs to which.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
