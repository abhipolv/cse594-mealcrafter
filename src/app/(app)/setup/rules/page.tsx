// G03 Rules you follow. Figma 96:1029. Track A. Update 5: one merged list of
// religious, cultural and ethical rules, a clear reminder of the rules people
// often forget, and "None apply" that waits for Next (E2).
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/data/profile";
import { RULE_PRESETS, type RulePreset } from "@/lib/rules/taxonomy";
import { ScreenView } from "@/components/screen-view";
import { Icon } from "@/components/icons";
import { MultiChoice } from "../multi-choice";
import { SetupHeader } from "../setup-parts";
import { saveRules } from "../actions";

const ORDER: RulePreset[] = ["halal", "kosher", "no_pork", "no_beef", "no_alcohol", "no_gelatin", "vegetarian", "vegan", "pescatarian"];

export default async function RulesPage({ searchParams }: PageProps<"/setup/rules">) {
  const user = await requireUser();
  const fromProfile = (await searchParams).from === "profile";
  const profile = await getProfile(user.id);
  const selected = [...new Set((profile?.rules ?? []).filter((r) => r.kind !== "allergy" && r.note).map((r) => r.note as string))];
  const other = (profile?.customRules ?? []).filter((r) => r.kind === "rule").map((r) => r.word);
  const hint = (p: RulePreset) => {
    const preset = RULE_PRESETS[p];
    return "limits" in preset ? preset.limits : undefined;
  };
  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2">
      <ScreenView code="G03" />
      <SetupHeader step={2} title="Rules you follow" back="/setup/never-eat" fromProfile={fromProfile} />
      <p className="card-check flex items-start gap-3 !py-3.5 text-[15px] leading-snug">
        <Icon name="alert" size={20} className="mt-px shrink-0" />
        <span>
          <b>Often forgotten:</b> no pork, no gelatin, no alcohol in cooking. Gelatin hides in sweets and alcohol in sauces.
        </span>
      </p>
      <MultiChoice
        action={saveRules}
        groups={[{ label: "Religious, cultural or ethical", options: ORDER.map((p) => ({ value: p, label: RULE_PRESETS[p].label, hint: hint(p) })) }]}
        selected={selected}
        other={other.join(", ")}
        none={!!profile?.rulesAnsweredAt}
        noneLabel="None apply"
        submitLabel={fromProfile ? "Save" : "Next"}
        fromProfile={fromProfile}
      />
    </main>
  );
}
