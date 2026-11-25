import type { Profile } from "@/lib/data/profile";
import { ALLERGY_LABELS, RULE_PRESETS, type RulePreset } from "@/lib/rules/taxonomy";
import { dollars } from "@/lib/rules-text";

const PERIOD = { meal: "a meal", week: "a week", two_weeks: "every 2 weeks" } as const;
const GOAL = { use_soon: "Use food before it spoils", protein: "More protein", variety: "More variety", fewer_pans: "Fewer pans" } as const;

/** Lines shown on G06 and 17, from the saved profile. */
export function profileSummary(p: Profile | null) {
  const allergies = [
    ...(p?.rules ?? [])
      .filter((r) => r.kind === "allergy")
      .map((r) => `${ALLERGY_LABELS[r.tag as keyof typeof ALLERGY_LABELS] ?? r.tag} (allergy)`),
    ...(p?.customRules ?? []).filter((r) => r.kind === "allergy").map((r) => `${r.word.charAt(0).toUpperCase()}${r.word.slice(1)} (allergy)`),
  ];
  const presets = [...new Set((p?.rules ?? []).filter((r) => r.kind !== "allergy" && r.note).map((r) => r.note as RulePreset))];
  const rules = [
    ...presets.filter((x) => x in RULE_PRESETS).map((x) => RULE_PRESETS[x].label),
    ...(p?.customRules ?? []).filter((r) => r.kind === "rule").map((r) => `No ${r.word}`),
  ];
  const budget = p?.budgetCents && p.budgetPeriod ? `${dollars(p.budgetCents)} ${PERIOD[p.budgetPeriod].replace(/^a /, "/ ").replace("every ", "/ ")}` : null;
  const time = p?.usualCookMinutes ? `${p.usualCookMinutes === 45 ? "45+" : p.usualCookMinutes} min on weeknights` : null;
  const goals = (p?.goals ?? []).map((g) => GOAL[g]);
  const others = Math.max(0, (p?.cooksFor ?? 1) - 1);
  const kitchen = [
    p?.fridgeShared ? `Shared with ${p.roommates} ${p.roommates === 1 ? "roommate" : "roommates"}` : p?.fridgeShared === false ? "Only your food in the fridge" : null,
    others ? `Cooking for you and ${others} ${others === 1 ? "other" : "others"}` : "Cooking for 1",
  ].filter((x): x is string => !!x);
  const budgetLong = p?.budgetCents && p.budgetPeriod ? `${dollars(p.budgetCents)} ${PERIOD[p.budgetPeriod]}` : null;
  return { allergies, rules, budget, budgetLong, time, goals, kitchen, others };
}
