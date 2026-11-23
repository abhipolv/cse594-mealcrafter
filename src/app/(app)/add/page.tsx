// G07 Add food. Figma 96:1219. Track B. Update 5 (E2): "Fridge photo" opens
// the photo capture, not video. A shared fridge goes through consent (G08) first.
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/data/profile";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { Icon, type IconName } from "@/components/icons";
import { TrackLink } from "@/components/track-link";

export default async function AddFoodPage({ searchParams }: PageProps<"/add">) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const firstRun = (await searchParams).first === "1";
  const needsConsent = profile?.fridgeShared === true && !profile.fridgeConsentAt;
  const scan = (mode: "video" | "photo") => (needsConsent ? `/add/consent?next=${mode}` : `/add/scan?mode=${mode}`);

  const options: { href: string; icon: IconName; title: string; sub: string; target: string; recommended?: boolean }[] = [
    { href: scan("video"), icon: "video", title: "Fridge video", sub: "Shelves, door and drawers in about 15 s", target: "video", recommended: true },
    { href: scan("photo"), icon: "camera", title: "Fridge photo", sub: "One shot of what is inside", target: "photo" },
    { href: "/add/scan?mode=receipt", icon: "receipt", title: "Receipt", sub: "A photo of your grocery receipt", target: "receipt" },
    { href: "/add/scan?mode=typed", icon: "pencil", title: "Type it in", sub: "List what you have", target: "typed" },
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-8">
      <ScreenView code="G07" />
      <PageHeader
        back={firstRun ? undefined : "/"}
        title="Add your food"
        subtitle={firstRun ? "Your profile is saved. Now show me what you have." : undefined}
      />
      <ul className="flex flex-col gap-3">
        {options.map((o) => (
          <li key={o.target}>
            <TrackLink
              href={o.href}
              screen="G07"
              target={o.target}
              className={`card pressable flex items-center gap-4 ${o.recommended ? "border-2 !p-[15px]" : ""}`}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-fill">
                <Icon name={o.icon} size={24} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[17px] font-semibold">{o.title}</span>
                  {o.recommended && <span className="rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-paper">Recommended</span>}
                </span>
                <span className="text-[14px] text-ink-2">{o.sub}</span>
              </span>
              <Icon name="chevron-right" size={18} className="shrink-0 text-ink-2" />
            </TrackLink>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 text-[14px] text-ink-2">
        <Icon name="eye-off" size={18} className="mt-px shrink-0" />
        Medication and personal items are skipped, not stored.
      </p>
      {firstRun && (
        <TrackLink href="/" screen="G07" target="skip_first_scan" className="btn mt-auto">
          Do this later
        </TrackLink>
      )}
    </main>
  );
}
