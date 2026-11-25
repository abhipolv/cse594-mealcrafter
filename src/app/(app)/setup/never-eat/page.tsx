// G02 Foods you never eat. Figma 96:982. Track A. Update 5 (E2): "None"
// waits for Next. Also the profile's edit screen (?from=profile).
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/data/profile";
import { ALLERGY_LABELS, ALLERGY_TAGS } from "@/lib/rules/taxonomy";
import { ScreenView } from "@/components/screen-view";
import { MultiChoice } from "../multi-choice";
import { SetupHeader } from "../setup-parts";
import { saveAllergies } from "../actions";

export default async function NeverEatPage({ searchParams }: PageProps<"/setup/never-eat">) {
  const user = await requireUser();
  const fromProfile = (await searchParams).from === "profile";
  const profile = await getProfile(user.id);
  const selected = (profile?.rules ?? []).filter((r) => r.kind === "allergy").map((r) => r.tag as string);
  const other = (profile?.customRules ?? []).filter((r) => r.kind === "allergy").map((r) => r.word);
  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2">
      <ScreenView code="G02" />
      <SetupHeader step={1} title="Foods you never eat" back="/setup" fromProfile={fromProfile} />
      <MultiChoice
        action={saveAllergies}
        groups={[{ label: "Allergies", options: ALLERGY_TAGS.map((t) => ({ value: t, label: ALLERGY_LABELS[t] })) }]}
        selected={selected}
        other={other.join(", ")}
        none={!!profile?.rulesAnsweredAt}
        noneLabel="None"
        submitLabel={fromProfile ? "Save" : "Next"}
        fromProfile={fromProfile}
        footnote={<p className="text-[14px] text-ink-2">Allergies also exclude &quot;may contain&quot; items, and anything I can&apos;t see inside.</p>}
      />
    </main>
  );
}
