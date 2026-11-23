// G11 Check items (review cards). Figma 98:987 (same as 05, 3:134). Track B.
// Update 1: one question per card, answers as buttons. Update 4: distinct
// confidence levels, a few cards at a time, rule-related first, skip allowed.
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getItems } from "@/lib/data/items";
import { getProfile, ruleContext } from "@/lib/data/profile";
import { itemTitle, reviewQuestion, sortForReview, STATE_LABEL } from "@/lib/items";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { ConfidenceChip } from "@/components/confidence-chip";
import { EvidenceBox } from "@/components/evidence-box";
import { ReviewList, type ReviewCardData } from "@/components/review-list";

const BACK = new Set(["/", "/fridge", "/add/results"]);

export default async function CheckPage({ searchParams }: PageProps<"/check">) {
  const user = await requireUser();
  const from = (await searchParams).from;
  const back = typeof from === "string" && BACK.has(from) ? from : "/fridge";
  const [items, profile] = await Promise.all([getItems(user.id, ["needs_check"]), getProfile(user.id)]);
  const ctx = ruleContext(profile);
  const sorted = sortForReview(items, ctx);

  const cards: ReviewCardData[] = sorted.map((i) => ({
    id: i.id,
    title: itemTitle(i),
    reading: STATE_LABEL[i.state],
    question: reviewQuestion(i, ctx),
    chip: <ConfidenceChip level={i.confidence} />,
    evidence: <EvidenceBox item={i} />,
  }));

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-8">
      <ScreenView code="G11" />
      <PageHeader
        back={back}
        title={cards.length === 0 ? "All checked" : `Check ${cards.length} ${cards.length === 1 ? "item" : "items"}`}
        subtitle={
          cards.length === 0
            ? "Nothing is waiting for you. Everything you confirmed can go into meals."
            : "Kept out of your meals until you check them. Questions about your food rules come first."
        }
      />
      {/* Always mounted, so answered cards keep their Undo after the list refreshes. */}
      <ReviewList cards={cards} screen="G11" />
      <Link href={cards.length === 0 ? "/fridge" : back} className={cards.length === 0 ? "btn-primary mt-2" : "btn mt-2"}>
        {cards.length === 0 ? "See your fridge" : "Done for now"}
      </Link>
    </main>
  );
}
