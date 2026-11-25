// G10 Scan results. Figma 96:1291. Track B. Update 4: the Finish button stays
// in view (sticky) instead of below the list; every scanned item can be
// opened to correct it, and the ones to check can be skipped.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getItems } from "@/lib/data/items";
import { getProfile } from "@/lib/data/profile";
import { itemTitle, STATE_LABEL } from "@/lib/items";
import { formatMoment, today as todayIso } from "@/lib/time";
import { ScreenView } from "@/components/screen-view";
import { PageHeader } from "@/components/page-header";
import { ItemRow } from "@/components/item-row";
import { TrackLink } from "@/components/track-link";
import { FrameViewer, type FrameData } from "./frame-viewer";

const SOURCE = { video: "your video", photo: "your photo", receipt: "your receipt", typed: "your list" } as const;

export default async function ResultsPage({ searchParams }: PageProps<"/add/results">) {
  const user = await requireUser();
  const scanId = (await searchParams).scan;
  if (typeof scanId !== "string" || !/^[0-9a-f-]{36}$/.test(scanId)) {
    const [latest] = await db
      .select({ id: schema.scans.id })
      .from(schema.scans)
      .where(and(eq(schema.scans.userId, user.id), eq(schema.scans.status, "done")))
      .orderBy(desc(schema.scans.createdAt))
      .limit(1);
    redirect(latest ? `/add/results?scan=${latest.id}` : "/add");
  }
  const [scan] = await db
    .select()
    .from(schema.scans)
    .where(and(eq(schema.scans.id, scanId), eq(schema.scans.userId, user.id)));
  if (!scan) notFound();

  const [all, media, profile] = await Promise.all([
    getItems(user.id),
    db
      .select({ id: schema.media.id, w: schema.media.width, h: schema.media.height })
      .from(schema.media)
      .where(and(eq(schema.media.scanId, scan.id), eq(schema.media.userId, user.id)))
      .orderBy(asc(schema.media.storagePath)),
    getProfile(user.id),
  ]);
  const items = all.filter((i) => i.scanId === scan.id && i.status !== "rejected" && i.status !== "used");
  const fresh = items.filter((i) => i.addedAt >= scan.createdAt);
  const updated = items.length - fresh.length;
  const toCheck = items.filter((i) => i.status === "needs_check");
  const added = items.filter((i) => i.status === "ready" || i.status === "reserved");
  const unclear = items.filter((i) => i.status === "unclear");
  const notMine = items.filter((i) => i.status === "not_mine");
  const found = items.length - unclear.length;
  const today = todayIso();
  // The first scan after setup finishes on Home, later ones on the fridge list.
  const [{ scans }] = await db
    .select({ scans: count() })
    .from(schema.scans)
    .where(and(eq(schema.scans.userId, user.id), eq(schema.scans.status, "done")));
  const firstRun = !!profile?.setupCompletedAt && scans <= 1;

  const frames: FrameData[] = media.map((m) => ({
    id: m.id,
    w: m.w ?? 4,
    h: m.h ?? 3,
    boxes: items
      .filter((i) => i.evidence.mediaId === m.id && i.evidence.box && i.status !== "unclear")
      .map((i) => ({ label: itemTitle(i), check: i.status === "needs_check", box: i.evidence.box! })),
  }));

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-2">
      <ScreenView code="G10" />
      <PageHeader
        back="/add"
        title={found === 1 ? "Found 1 item" : `Found ${found} items`}
        subtitle={`From ${SOURCE[scan.source]}, ${formatMoment(scan.createdAt)}.`}
      />

      {frames.length > 0 && <FrameViewer frames={frames} />}
      {frames.some((f) => f.boxes.length > 0) && (
        <div className="flex gap-5 text-[14px]" aria-hidden>
          <span className="flex items-center gap-2">
            <span className="size-4 rounded-[3px] bg-ink" /> Added
          </span>
          <span className="flex items-center gap-2">
            <span className="size-4 rounded-[3px] border-2 border-dashed border-ink" /> Needs your check
          </span>
        </div>
      )}

      <section className="card grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-2" aria-label="Summary">
        <span className="text-right text-[24px] font-bold tabular-nums">{added.length}</span>
        <span className="text-[16px]">ready to cook</span>
        <span className="text-right text-[24px] font-bold tabular-nums">{toCheck.length}</span>
        <span className="text-[16px]">{toCheck.length === 1 ? "needs" : "need"} your check first</span>
        {unclear.length > 0 && (
          <>
            <span className="text-right text-[24px] font-bold text-ink-2 tabular-nums">{unclear.length}</span>
            <span className="text-[16px] text-ink-2">couldn&apos;t see clearly, not added</span>
          </>
        )}
        {updated > 0 && (
          <p className="col-span-2 border-t border-line pt-2 text-[14px] text-ink-2">
            {updated} {updated === 1 ? "was" : "were"} already on your list and got the new photo.
          </p>
        )}
      </section>

      {toCheck.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="check">
          <h2 id="check" className="section-label">
            Needs your check
          </h2>
          <ul className="flex flex-col gap-2">
            {toCheck.map((i) => (
              <ItemRow key={i.id} item={i} today={today} detail={i.checkReason ?? STATE_LABEL[i.state]} right={<span className="chip-maize">Check</span>} />
            ))}
          </ul>
        </section>
      )}
      {added.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="added">
          <h2 id="added" className="section-label">
            Added
          </h2>
          <ul className="flex flex-col gap-2">
            {added.map((i) => (
              <ItemRow key={i.id} item={i} today={today} />
            ))}
          </ul>
        </section>
      )}
      {unclear.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="unclear">
          <h2 id="unclear" className="section-label">
            Couldn&apos;t see clearly
          </h2>
          <ul className="flex flex-col gap-2">
            {unclear.map((i) => (
              <ItemRow key={i.id} item={i} today={today} muted detail={i.evidence.where ?? "Not added to meals"} right={<span />} />
            ))}
          </ul>
        </section>
      )}
      {notMine.length > 0 && (
        <p className="text-[14px] text-ink-2">
          {notMine.length} {notMine.length === 1 ? "item was" : "items were"} marked &quot;not mine&quot; before, so I left {notMine.length === 1 ? "it" : "them"} out.
        </p>
      )}
      {items.length === 0 && (
        <p className="note">I didn&apos;t find any food. Try again with more light, closer to the shelves, or type your food in.</p>
      )}

      <div className="action-bar mt-auto flex flex-col gap-2">
        {toCheck.length > 0 ? (
          <>
            <TrackLink href="/check?from=/add/results" screen="G10" target="check" className="btn-primary w-full">
              Check {toCheck.length} {toCheck.length === 1 ? "item" : "items"} now
            </TrackLink>
            <TrackLink href={firstRun ? "/" : "/fridge"} screen="G10" target="finish_later" className="btn w-full">
              Finish, check later
            </TrackLink>
          </>
        ) : (
          <TrackLink href={firstRun ? "/" : "/fridge"} screen="G10" target="finish" className="btn-primary w-full">
            {items.length === 0 ? "Back" : "Finish"}
          </TrackLink>
        )}
        {items.length === 0 && (
          <Link href="/add" className="btn w-full">
            Try another way
          </Link>
        )}
      </div>
    </main>
  );
}
