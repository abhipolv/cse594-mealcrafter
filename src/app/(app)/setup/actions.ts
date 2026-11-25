"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getProfile, saveProfile } from "@/lib/data/profile";
import { logEvent } from "@/lib/events-server";
import { ALLERGY_TAGS, RULE_PRESETS, type RulePreset } from "@/lib/rules/taxonomy";
import { GOALS, type CustomRule, type UserRule } from "@/lib/db/schema";

export type SetupState = { error?: string };

const fromProfile = (fd: FormData) => fd.get("from") === "profile";

/** "+ Other" text: comma or line separated words, kept short and plain. */
function words(text: FormDataEntryValue | null): string[] {
  return [
    ...new Set(
      String(text ?? "")
        .split(/[,;\n]/)
        .map((w) => w.trim().toLowerCase().replace(/[^a-z0-9 '-]/g, ""))
        .filter((w) => w.length >= 2 && w.length <= 40),
    ),
  ].slice(0, 10);
}

/** G02 Foods you never eat (allergies). "None" must be chosen on purpose and confirmed with Next (E2). */
export async function saveAllergies(_prev: SetupState, fd: FormData): Promise<SetupState> {
  const user = await requireUser();
  const tags = z.array(z.enum(ALLERGY_TAGS)).catch([]).parse(fd.getAll("choice"));
  const none = fd.get("none") === "on";
  const other = fd.get("otherOn") === "on" ? words(fd.get("other")) : [];
  if (!none && tags.length === 0 && other.length === 0) return { error: "Pick any that apply, or choose None." };
  const profile = await getProfile(user.id);
  const keep = (profile?.rules ?? []).filter((r) => r.kind !== "allergy");
  const rules: UserRule[] = none ? keep : [...keep, ...tags.map((tag) => ({ tag, kind: "allergy" as const }))];
  const customRules: CustomRule[] = [
    ...(profile?.customRules ?? []).filter((r) => r.kind !== "allergy"),
    ...(none ? [] : other.map((word) => ({ word, kind: "allergy" as const }))),
  ];
  await saveProfile(user.id, { rules, customRules });
  await logEvent(user.id, "setup_step", "G02", { step: "allergies", tags, other: other.length, none });
  redirect(fromProfile(fd) ? "/profile" : "/setup/rules");
}

const PRESET_KEYS = Object.keys(RULE_PRESETS) as [RulePreset, ...RulePreset[]];
const ETHICAL: RulePreset[] = ["vegetarian", "vegan", "pescatarian"];

/** G03 Rules you follow: one merged list of religious, cultural and ethical rules (update 5). */
export async function saveRules(_prev: SetupState, fd: FormData): Promise<SetupState> {
  const user = await requireUser();
  const presets = z.array(z.enum(PRESET_KEYS)).catch([]).parse(fd.getAll("choice"));
  const none = fd.get("none") === "on";
  const other = fd.get("otherOn") === "on" ? words(fd.get("other")) : [];
  if (!none && presets.length === 0 && other.length === 0) return { error: "Pick any that apply, or choose None apply." };
  const profile = await getProfile(user.id);
  const allergies = (profile?.rules ?? []).filter((r) => r.kind === "allergy");
  const added: UserRule[] = none
    ? []
    : presets.flatMap((p) =>
        RULE_PRESETS[p].tags.map((tag) => ({ tag, kind: ETHICAL.includes(p) ? ("ethical" as const) : ("religious" as const), note: p })),
      );
  const customRules: CustomRule[] = [
    ...(profile?.customRules ?? []).filter((r) => r.kind !== "rule"),
    ...(none ? [] : other.map((word) => ({ word, kind: "rule" as const }))),
  ];
  await saveProfile(user.id, { rules: [...allergies, ...added], customRules, rulesAnsweredAt: new Date() });
  await logEvent(user.id, "setup_step", "G03", { step: "rules", presets, other: other.length, none });
  redirect(fromProfile(fd) ? "/profile" : "/setup/budget");
}

const BudgetInput = z.object({
  period: z.enum(["meal", "week", "two_weeks"]),
  amount: z.coerce.number().min(1, "Type an amount in dollars.").max(2000, "That budget looks too big."),
  minutes: z.coerce.number().int().refine((n) => [15, 20, 30, 45].includes(n), "Pick a cooking time."),
  goals: z.array(z.enum(GOALS)),
});

/** G04 Budget and time. */
export async function saveBudget(_prev: SetupState, fd: FormData): Promise<SetupState> {
  const user = await requireUser();
  const parsed = BudgetInput.safeParse({
    period: fd.get("period"),
    amount: String(fd.get("amount") ?? "").replace(/[$,\s]/g, ""),
    minutes: fd.get("minutes"),
    goals: fd.getAll("goal"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields." };
  const { period, amount, minutes, goals } = parsed.data;
  await saveProfile(user.id, { budgetPeriod: period, budgetCents: Math.round(amount * 100), usualCookMinutes: minutes, goals });
  await logEvent(user.id, "setup_step", "G04", { step: "budget", period, minutes, goals });
  redirect(fromProfile(fd) ? "/profile" : "/setup/kitchen");
}

const KitchenInput = z.object({
  shared: z.enum(["just_me", "others"]),
  roommates: z.coerce.number().int().min(0).max(12),
  cooks: z.enum(["just_me", "others"]),
  others: z.coerce.number().int().min(0).max(10),
  agreed: z.boolean(),
});

/** G05 Your kitchen. Update 8: cooking for others needs their agreement. */
export async function saveKitchen(_prev: SetupState, fd: FormData): Promise<SetupState> {
  const user = await requireUser();
  const parsed = KitchenInput.safeParse({
    shared: fd.get("shared"),
    roommates: fd.get("roommates") ?? 0,
    cooks: fd.get("cooks"),
    others: fd.get("others") ?? 0,
    agreed: fd.get("agreed") === "on",
  });
  if (!parsed.success) return { error: "Answer both questions." };
  const { shared, roommates, cooks, others, agreed } = parsed.data;
  if (shared === "others" && roommates < 1) return { error: "How many people share your fridge?" };
  if (cooks === "others" && others < 1) return { error: "How many people do you cook for?" };
  if (cooks === "others" && !agreed) return { error: "Check that they agreed before I plan meals for them." };
  const profile = await getProfile(user.id);
  const fridgeShared = shared === "others";
  await saveProfile(user.id, {
    fridgeShared,
    roommates: fridgeShared ? roommates : 0,
    // Changing who shares the fridge means asking the new roommates again.
    fridgeConsentAt: fridgeShared && profile?.fridgeShared && profile.roommates === roommates ? profile.fridgeConsentAt : null,
    cooksFor: cooks === "others" ? 1 + others : 1,
    othersAgreedAt: cooks === "others" ? (profile?.othersAgreedAt ?? new Date()) : null,
  });
  await logEvent(user.id, "setup_step", "G05", { step: "kitchen", shared: fridgeShared, roommates, cooksFor: cooks === "others" ? 1 + others : 1 });
  redirect(fromProfile(fd) ? "/profile" : "/setup/summary");
}

/** G06 "Looks right": setup is done; the first food scan comes next. */
export async function finishSetup() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile?.rulesAnsweredAt || !profile.budgetPeriod || profile.fridgeShared === null) redirect("/setup/never-eat");
  await saveProfile(user.id, { setupCompletedAt: profile.setupCompletedAt ?? new Date() });
  await logEvent(user.id, "setup_step", "G06", { step: "done" });
  redirect(profile.setupCompletedAt ? "/" : "/add?first=1");
}
