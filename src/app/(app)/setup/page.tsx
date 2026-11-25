// G01 Welcome. Figma 96:960. Track A. What the app can and can't do, before setup.
import { requireUser } from "@/lib/auth/session";
import { ScreenView } from "@/components/screen-view";
import { TrackLink } from "@/components/track-link";
import { Icon } from "@/components/icons";

export default async function WelcomePage() {
  await requireUser();
  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-8 pb-8">
      <ScreenView code="G01" />
      <header className="flex flex-col gap-2">
        <h1 className="text-[30px] leading-tight font-bold">MealCrafter</h1>
        <p className="text-[16px] text-ink-2">Tracks your food. Suggests meals. You decide.</p>
      </header>
      <section className="card flex flex-col gap-2" aria-labelledby="can">
        <h2 id="can" className="section-label">
          I can
        </h2>
        <ul className="flex flex-col gap-2 text-[15px] leading-snug">
          {["Find food in a fridge video, photo or receipt", "Track if food is frozen, raw, cooked or leftover", "Suggest meals for tonight or the week"].map((t) => (
            <li key={t} className="flex gap-2">
              <Icon name="check" size={18} className="mt-px shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </section>
      <section className="note flex flex-col gap-2 !p-4" aria-labelledby="cant">
        <h2 id="cant" className="section-label">
          I can&apos;t
        </h2>
        <ul className="flex flex-col gap-2 text-[15px] leading-snug">
          {["Tell if food is safe to eat", "See inside foil, bags or closed boxes", "Know whose food is whose"].map((t) => (
            <li key={t} className="flex gap-2">
              <Icon name="x" size={18} className="mt-px shrink-0" />
              {t}
            </li>
          ))}
        </ul>
        <p className="text-[14px] text-ink-2">So I ask you when I am unsure, and keep unchecked food out of your meals.</p>
      </section>
      <TrackLink href="/setup/never-eat" screen="G01" target="start_setup" className="btn-primary mt-1">
        Set up (2 min)
      </TrackLink>
    </main>
  );
}
