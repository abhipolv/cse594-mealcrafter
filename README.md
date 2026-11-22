# MealCrafter

A meal planning assistant for students who cook with limited time and money. CSE 594 (Human-AI Interaction), University of Michigan, Fall 2026. Team: Abhipol Vibhatasilpin, Omer Aydas, Ahmad Chalhoub, Jeffrey Shulkin.

MealCrafter builds an inventory of your fridge from a video, photo, receipt or typed entry, asks you to check the items it is unsure about, and suggests meals you can cook now that respect your food rules.

## Run it locally

You need Node 24 or newer, pnpm, and Docker.

```bash
pnpm install
pnpm setup                      # .env.local, Postgres in Docker (port 54329), migrations, demo data
pnpm dev                        # http://localhost:3000, log in with sam-demo (local only)
```

The AI runs in mock mode by default, so no API key is needed. Coding agents: read `AGENTS.md`.

## How it is deployed

- Pull requests: GitHub Actions runs lint, typecheck, unit tests, migrations, build and a browser smoke test (`ci.yml`), and deploys a Vercel preview whose link is posted on the PR (`deploy.yml`).
- `main`: `deploy.yml` applies new migrations to the Supabase database, then deploys to Vercel production. Vercel's own Git integration is off; all deploys go through GitHub Actions.

## Data and privacy

This repository is public and holds source code only. Fridge photos, videos, receipts and study data live in the team's private storage and are never committed.
