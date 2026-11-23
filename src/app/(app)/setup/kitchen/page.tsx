// G05 Your kitchen. Figma 96:1141. Track A. Update 8: a shared fridge, and
// the people you cook for, with their agreement.
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/data/profile";
import { ScreenView } from "@/components/screen-view";
import { SetupHeader } from "../setup-parts";
import { KitchenForm } from "./kitchen-form";

export default async function KitchenPage({ searchParams }: PageProps<"/setup/kitchen">) {
  const user = await requireUser();
  const fromProfile = (await searchParams).from === "profile";
  const p = await getProfile(user.id);
  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2">
      <ScreenView code="G05" />
      <SetupHeader step={4} title="Your kitchen" back="/setup/budget" fromProfile={fromProfile} />
      <KitchenForm
        shared={p?.fridgeShared ?? null}
        roommates={p?.roommates ?? 0}
        others={Math.max(0, (p?.cooksFor ?? 1) - 1)}
        agreed={!!p?.othersAgreedAt}
        fromProfile={fromProfile}
      />
    </main>
  );
}
