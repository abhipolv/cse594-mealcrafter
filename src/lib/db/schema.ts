// MealCrafter data model. This file is the contract between the four build
// tracks: change it only in a PR that says so in its title, and add a
// migration with `pnpm db:generate`.
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  date,
  bigserial,
  index,
} from "drizzle-orm/pg-core";
import type { RuleTag } from "@/lib/rules/taxonomy";

// ---------- People ----------

/** One row per login code. Participants, teammates and the demo persona. */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(), // what they type to log in, e.g. "p03-basil"
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["participant", "team", "demo"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRule = {
  tag: RuleTag; // e.g. "tree_nuts", "pork"
  kind: "allergy" | "religious" | "ethical" | "dislike";
  /** Which setup choice added the rule, e.g. "halal" or "vegetarian" (G03). */
  note?: string;
};

/** A rule typed under "+ Other" in setup. The rule filter matches the words in ingredient names. */
export type CustomRule = {
  word: string; // e.g. "mango"
  kind: "allergy" | "rule";
};

export const GOALS = ["use_soon", "protein", "variety", "fewer_pans"] as const;
export type Goal = (typeof GOALS)[number];

/** Setup answers (screens G01 to G06, edited on 17 Profile). */
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  rules: jsonb("rules").$type<UserRule[]>().notNull().default([]),
  customRules: jsonb("custom_rules").$type<CustomRule[]>().notNull().default([]),
  /** Set once the user answered G02 and G03, even with "none", so setup can tell "none" from "not asked". */
  rulesAnsweredAt: timestamp("rules_answered_at", { withTimezone: true }),
  budgetCents: integer("budget_cents"),
  budgetPeriod: text("budget_period", { enum: ["meal", "week", "two_weeks"] }),
  usualCookMinutes: integer("usual_cook_minutes"),
  goals: jsonb("goals").$type<Goal[]>().notNull().default([]),
  fridgeShared: boolean("fridge_shared"),
  /** People besides the user who share the fridge (G05, named on G08). */
  roommates: integer("roommates").notNull().default(0),
  fridgeConsentAt: timestamp("fridge_consent_at", { withTimezone: true }),
  cooksFor: integer("cooks_for").notNull().default(1),
  /** When the user confirmed the people they cook for agreed to it (update 8). */
  othersAgreedAt: timestamp("others_agreed_at", { withTimezone: true }),
  setupCompletedAt: timestamp("setup_completed_at", { withTimezone: true }),
});

// ---------- Scans and evidence ----------

/** One capture session: a fridge video, photos, a receipt, or typed entry. */
export const scans = pgTable("scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: text("source", { enum: ["video", "photo", "receipt", "typed"] }).notNull(),
  status: text("status", { enum: ["uploading", "recognizing", "done", "failed"] })
    .notNull()
    .default("uploading"),
  model: text("model"), // which recognizer produced the items, for the eval
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A stored image: a photo, a frame taken from a video, or a receipt. */
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  scanId: uuid("scan_id").references(() => scans.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  kind: text("kind", { enum: ["frame", "photo", "receipt"] }).notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Evidence = {
  mediaId?: string;
  /** Box as fractions of the image (0 to 1). Approximate; shown as a crop. */
  box?: { x: number; y: number; w: number; h: number };
  /** Receipt line or label text the recognizer read. */
  text?: string;
  /** Where in the fridge, e.g. "top shelf", "door". */
  where?: string;
};

// ---------- Inventory ----------

export const ITEM_STATES = ["raw", "cooked", "leftover", "frozen", "pantry"] as const;
export const ITEM_STATUSES = [
  "ready", // checked or confident; usable in meals
  "needs_check", // waiting on a review card; never used in meals
  "reserved", // saved for a planned meal
  "not_mine", // belongs to someone else; never used, kept only to avoid re-asking
  "rejected", // user said the recognizer was wrong
  "used", // cooked or thrown out
  "unclear", // "couldn't see clearly"; listed separately, not in meals
] as const;
export const CONFIDENCES = ["high", "medium", "low", "cant_see"] as const;

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scanId: uuid("scan_id").references(() => scans.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    quantity: text("quantity"), // free text: "x7", "about 2 cups"
    state: text("state", { enum: ITEM_STATES }).notNull().default("raw"),
    status: text("status", { enum: ITEM_STATUSES }).notNull().default("needs_check"),
    confidence: text("confidence", { enum: CONFIDENCES }).notNull().default("medium"),
    /** Rule tags the recognizer thinks the item may contain. */
    mayContain: jsonb("may_contain").$type<RuleTag[]>().notNull().default([]),
    /** True once the user or a readable label settled what the item contains. */
    contentsKnown: boolean("contents_known").notNull().default(false),
    evidence: jsonb("evidence").$type<Evidence>().notNull().default({}),
    /** Why the app asks about this item (shown on the review card). */
    checkReason: text("check_reason"),
    useBy: date("use_by"),
    openedAt: date("opened_at"),
    reservedForMealId: uuid("reserved_for_meal_id"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("items_user_status_idx").on(t.userId, t.status)],
);

/** Every answer to a review card. Primary data for N2. */
export const itemChecks = pgTable("item_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(), // the button label the user pressed
  before: jsonb("before").$type<Record<string, unknown>>(),
  after: jsonb("after").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Meals ----------

export type MealIngredient = {
  name: string;
  quantity?: string;
  itemId?: string; // inventory item it comes from, if any
};

export type Recipe = {
  title: string;
  minutes: number;
  pans: number;
  servings: number;
  leftovers?: string;
  ingredients: MealIngredient[];
  steps: string[];
  extraCostCents?: number;
  nutrition?: { kcal?: number; proteinG?: number };
  /** The suggester's one-line reason this meal fits tonight. */
  why?: string;
};

/** A dinner on the week plan (12 to 16). */
export const plannedMeals = pgTable("planned_meals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ["planned", "skipped", "moved", "cooked"] })
    .notNull()
    .default("planned"),
  recipe: jsonb("recipe").$type<Recipe>(),
  skipReason: text("skip_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One "What can I cook now?" request and what came back (08 to 09). */
export const suggestions = pgTable("suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  request: jsonb("request")
    .$type<{ minutes: number; readyOnly: boolean; allowReserved?: boolean; forDay?: string }>()
    .notNull(),
  shown: jsonb("shown").$type<Recipe[]>().notNull(),
  /** Meals the rule filter removed, with reasons. Evidence for N1. */
  filteredOut: jsonb("filtered_out")
    .$type<{ title: string; reasons: string[] }[]>()
    .notNull()
    .default([]),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** After a meal: was it cooked as suggested, and what was really used (update 2). */
export const cookLogs = pgTable("cook_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** Which recipe was cooked: "s.<suggestionId>.<index>" or "p.<plannedMealId>". */
  recipeRef: text("recipe_ref"),
  plannedMealId: uuid("planned_meal_id").references(() => plannedMeals.id, { onDelete: "set null" }),
  cookedAsSuggested: boolean("cooked_as_suggested"),
  usedItemIds: jsonb("used_item_ids").$type<string[]>().notNull().default([]),
  /** Spend on ingredients not already in the fridge; counts against the weekly budget (update 9). */
  extraCostCents: integer("extra_cost_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlanRow = {
  id: string;
  day: string;
  title: string;
  status: "planned" | "skipped" | "moved" | "cooked";
  skipReason: string | null;
};

/** One change to the week plan (skip, move, swap, replan), kept so 16 can highlight and undo it. */
export const planChanges = pgTable("plan_changes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["skip", "move", "swap", "replan", "add"] }).notNull(),
  /** Rows as they were before the change, and the item reservations, for undo. */
  before: jsonb("before")
    .$type<{ meals: PlanRow[]; reservations: { itemId: string; status: string; mealId: string | null }[] }>()
    .notNull(),
  /** Per-day labels shown on 16, e.g. { "2026-11-27": "Moved from Thu" }. */
  labels: jsonb("labels").$type<Record<string, string>>().notNull().default({}),
  undoneAt: timestamp("undone_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Study log ----------

/** Interaction log for the evaluation (N4 taps to recipe, time on review, etc.). */
export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id"),
    name: text("name").notNull(), // e.g. "screen_view", "tap", "check_answer"
    screen: text("screen"), // screen code from src/lib/screens.ts, e.g. "01"
    props: jsonb("props").$type<Record<string, unknown>>().notNull().default({}),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_user_at_idx").on(t.userId, t.at)],
);
