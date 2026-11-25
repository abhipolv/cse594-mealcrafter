// G08 Consent (shared fridge). Figma 96:1249. Track B. Shown only when the
// fridge is shared and consent is not recorded. Names who receives the photos.
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/data/profile";
import { photoRecipient } from "@/lib/ai";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { giveConsent, chooseReceipt } from "./actions";

export default async function ConsentPage({ searchParams }: PageProps<"/add/consent">) {
  const user = await requireUser();
  const next = (await searchParams).next === "photo" ? "photo" : "video";
  const profile = await getProfile(user.id);
  if (!profile?.fridgeShared || profile.fridgeConsentAt) redirect(`/add/scan?mode=${next}`);
  const n = profile.roommates;
  const recipient = photoRecipient();

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-8">
      <ScreenView code="G08" />
      <PageHeader
        back="/add"
        title={n === 1 ? "Your roommate" : "Your roommates"}
        subtitle={`${n > 0 ? `${n} ${n === 1 ? "roommate shares" : "roommates share"}` : "Others share"} this fridge. Their food may appear in the ${next}.`}
      />
      <section className="note flex flex-col gap-1.5 !p-4">
        <h2 className="text-[17px] font-semibold">Have they agreed?</h2>
        <p className="text-[15px] text-ink-2">Later, mark anything &quot;not mine&quot; and I will never use it.</p>
      </section>
      <section className="card flex flex-col gap-1.5 border-line">
        <h2 className="text-[14px] font-semibold text-ink-2">Who sees the photos</h2>
        <p className="text-[15px] leading-snug">
          {recipient
            ? `The photos are sent to ${recipient} to find the food, and kept in the study's private storage.`
            : "In this test setup no AI service sees the photos. They are kept on this server only."}{" "}
          Medication and personal items are skipped.
        </p>
      </section>
      <form action={giveConsent} className="flex flex-col gap-3 pt-1">
        <input type="hidden" name="next" value={next} />
        <SubmitButton pending="Saving...">Yes, they agreed</SubmitButton>
      </form>
      <form action={chooseReceipt}>
        <SubmitButton className="btn w-full" pending="Opening...">
          Use a receipt instead
        </SubmitButton>
      </form>
    </main>
  );
}
