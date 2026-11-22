# MealCrafter

A meal planning assistant for students who cook with limited time and money. CSE 594 (Human-AI Interaction), University of Michigan, Fall 2026. Team: Abhipol Vibhatasilpin, Omer Aydas, Ahmad Chalhoub, Jeffrey Shulkin.

MealCrafter builds an inventory of your fridge from a video, photo, receipt or typed entry, asks you to check the items it is unsure about, and suggests meals you can cook now that respect your food rules.

## Run it locally

You need Node 24 or newer, pnpm, and Docker.

```bash
pnpm install
cp .env.example .env.local      # set SESSION_SECRET: openssl rand -base64 32
pnpm db:up                      # Postgres in Docker on port 54329
pnpm db:migrate && pnpm db:seed
pnpm dev                        # http://localhost:3000, log in with sam-demo
```

The AI runs in mock mode by default, so no API key is needed. Coding agents: read `AGENTS.md`.

## How it is deployed

- Pull requests: GitHub Actions runs lint, typecheck, unit tests, migrations, build and a browser smoke test. Vercel builds a preview.
- `main`: Vercel deploys to production; new migrations are applied to the Supabase database by `.github/workflows/migrate.yml`.

## Data and privacy

This repository is public and holds source code only. Fridge photos, videos, receipts and study data live in the team's private storage and are never committed.
