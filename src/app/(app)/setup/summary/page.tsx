// G06 Your profile (summary). Figma 96:1185. Track A. "Looks right" ends
// setup and opens the first food scan.
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/data/profile";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { finishSetup } from "../actions";
import { profileSummary } from "../profile-summary";

function Card({ label, lines, empty }: { label: string; lines: string[]; empty: string }) {
  return (
    <section className="card flex flex-col gap-2">
      <h2 className="section-label">{label}</h2>
      {lines.length ? (
        <ul className="flex flex-col gap-1.5">
          {lines.map((l) => (
            <li key={l} className="text-[16px] font-semibold">
              {l}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[16px] text-ink-2">{empty}</p>
      )}
    </section>
  );
}

export default async function SummaryPage() {
  const user = await requireUser();
  const s = profileSummary(await getProfile(user.id));
  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-8">
      <ScreenView code="G06" />
      <PageHeader back="/setup/kitchen" title="Your profile" subtitle="Checked against every suggestion." />
      <Card label="Never" lines={[...s.allergies, ...s.rules]} empty="No food rules" />
      <Card label="Flexible" lines={[s.budget, s.time, ...s.goals].filter((x): x is string => !!x)} empty="No budget set" />
      <Card label="Kitchen" lines={s.kitchen} empty="Not answered yet" />
      <form action={finishSetup} className="mt-1">
        <SubmitButton pending="Saving...">Looks right</SubmitButton>
      </form>
      <Link href="/setup/never-eat" className="btn">
        Edit
      </Link>
    </main>
  );
}
