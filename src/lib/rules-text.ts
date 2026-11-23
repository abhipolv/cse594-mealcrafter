import { RULE_LABELS, type RuleTag } from "@/lib/rules/taxonomy";

function names(tags: readonly RuleTag[], words: readonly string[]) {
  return [...tags.map((t) => RULE_LABELS[t].replace(/ \(.*\)$/, "").toLowerCase()), ...words.map((w) => w.toLowerCase())];
}

/** "No peanuts or tree nuts" for a meal that passed the rule filter; null without rules. */
export function fitsText(tags: readonly RuleTag[], words: readonly string[]): string | null {
  const n = names(tags, words);
  if (n.length === 0) return null;
  if (n.length === 1) return `No ${n[0]}`;
  return `No ${n.slice(0, -1).join(", ")} or ${n[n.length - 1]}`;
}

/** "no peanuts, no tree nuts" for the profile line on 08. */
export function rulesList(tags: readonly RuleTag[], words: readonly string[]): string {
  return names(tags, words)
    .map((n) => `no ${n}`)
    .join(", ");
}

/** "$70" or "$1.50". */
export function dollars(cents: number): string {
  const whole = cents % 100 === 0;
  return `$${(cents / 100).toFixed(whole ? 0 : 2)}`;
}

/** Turns a rule-filter reason ("Basil pesto: not checked yet") into a short sentence for 09. */
export function humanizeReason(reason: string): string {
  const i = reason.lastIndexOf(": ");
  if (i < 0) return reason;
  const what = reason.slice(0, i);
  const why = reason.slice(i + 2);
  const lower = what.toLowerCase();
  if (why === "not checked yet") return `uses the ${lower}, which you have not checked yet`;
  if (why === "saved for a planned meal") return `uses the ${lower}, saved for a planned meal`;
  if (why === "not in your fridge" || why === "already used") return `needs ${lower}, which is not in your fridge`;
  if (why === "not yours") return `uses the ${lower}, which is not yours`;
  if (why === "not identified") return `uses something I could not identify`;
  if (why === "ingredients unknown") return `uses the ${lower}, and what is in it is unknown`;
  if (why.startsWith("may contain ")) return `the ${lower} may contain ${why.slice(12)}`;
  return `uses the ${lower}, which can have ${why}`;
}
