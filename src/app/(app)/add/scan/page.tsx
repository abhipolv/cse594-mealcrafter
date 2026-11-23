// G09 Scan. Figma 96:1273. Track B. Captures video frames or photos, resized
// on the phone, and sends them to the recognizer; or takes a typed list.
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/data/profile";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { Capture } from "./capture";
import { TypedForm } from "./typed-form";

const MODES = ["video", "photo", "receipt", "typed"] as const;

export default async function ScanPage({ searchParams }: PageProps<"/add/scan">) {
  const user = await requireUser();
  const raw = (await searchParams).mode;
  const mode = MODES.find((m) => m === raw) ?? "video";
  if (mode === "video" || mode === "photo") {
    const profile = await getProfile(user.id);
    if (profile?.fridgeShared && !profile.fridgeConsentAt) redirect(`/add/consent?next=${mode}`);
  }

  if (mode === "typed") {
    return (
      <main className="flex flex-1 flex-col gap-4 px-5 pt-2">
        <ScreenView code="G09" />
        <PageHeader back="/add" title="Type it in" subtitle="I add what you list. Mixed foods get a quick check against your rules." />
        <TypedForm />
      </main>
    );
  }
  return (
    <main className="flex flex-1 flex-col">
      <ScreenView code="G09" />
      <Capture mode={mode} />
    </main>
  );
}
