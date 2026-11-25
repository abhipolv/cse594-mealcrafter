"use client";
// G11 review cards. Update 1: one question per card, buttons worded as answers.
// Update 4: rule-related cards first (sorted on the server), only a few cards
// at once, every card can be skipped. Answers switch the card in place; Undo
// puts the item back the way it was.
import { useState, useTransition, type ReactNode } from "react";
import type { ReviewQuestion } from "@/lib/items";
import { track } from "@/lib/events";
import { answerCheck, undoCheck, type AnswerValue } from "@/app/(app)/check/actions";
import { Icon } from "./icons";

export type ReviewCardData = {
  id: string;
  title: string;
  /** Short facts under the name, e.g. "Leftover". */
  reading: string;
  question: ReviewQuestion;
  chip: ReactNode;
  evidence: ReactNode;
};

type Done = { id: string; title: string; label: string; checkId: string };

const BATCH = 3;

export function ReviewList({ cards, screen }: { cards: ReviewCardData[]; screen: string }) {
  const [done, setDone] = useState<Done[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const doneIds = new Set(done.map((d) => d.id));

  // Skipped cards go to the back of the line for this visit.
  const open = cards.filter((c) => !doneIds.has(c.id));
  const queue = [...open.filter((c) => !skipped.includes(c.id)), ...open.filter((c) => skipped.includes(c.id))];
  const visible = queue.slice(0, BATCH);
  const later = queue.length - visible.length;

  return (
    <div className="flex flex-col gap-3">
      {done.map((d) => (
        <DoneRow
          key={d.checkId}
          done={d}
          screen={screen}
          onUndone={() => setDone((all) => all.filter((x) => x.checkId !== d.checkId))}
        />
      ))}
      {visible.map((c) => (
        <ReviewCard
          key={c.id}
          card={c}
          screen={screen}
          onDone={(label, checkId) => setDone((all) => [...all, { id: c.id, title: c.title, label, checkId }])}
          onSkip={() => setSkipped((s) => [...s.filter((x) => x !== c.id), c.id])}
          canSkip={queue.length > 1}
        />
      ))}
      {queue.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-fill">
            <Icon name="check" size={28} />
          </span>
          {done.length > 0 && <p className="text-[15px] text-ink-2">That was the last one.</p>}
        </div>
      )}
      {later > 0 && (
        <p className="text-center text-[14px] text-ink-2">
          {later} more after these. Answer or skip to see them.
        </p>
      )}
    </div>
  );
}

function DoneRow({ done, screen, onUndone }: { done: Done; screen: string; onUndone: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className="card fade-in flex min-h-[56px] items-center gap-3 !py-2">
      <Icon name="check" size={20} className="shrink-0" />
      <p className="min-w-0 flex-1 text-[15px]">
        <span className="font-semibold">{done.title}:</span> {done.label}
      </p>
      <button
        type="button"
        disabled={pending}
        className="btn btn-sm !min-h-[40px] shrink-0"
        onClick={() =>
          start(async () => {
            const r = await undoCheck(done.checkId);
            if (r.ok) {
              track("check_answer", screen, { itemId: done.id, answer: "Undo", undid: done.label });
              onUndone();
            }
          })
        }
      >
        <Icon name="undo" size={16} />
        {pending ? "Undoing..." : "Undo"}
      </button>
    </div>
  );
}

function ReviewCard({
  card,
  screen,
  onDone,
  onSkip,
  canSkip,
}: {
  card: ReviewCardData;
  screen: string;
  onDone: (label: string, checkId: string) => void;
  onSkip: () => void;
  canSkip: boolean;
}) {
  const q = card.question;
  const [naming, setNaming] = useState(q.kind === "identify");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function send(answer: AnswerValue, newName?: string) {
    setPending(answer);
    setError(null);
    const r = await answerCheck({ itemId: card.id, answer, newName });
    setPending(null);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    track("check_answer", screen, { itemId: card.id, question: q.question, answer: r.label, kind: q.kind });
    if (answer === "skip") onSkip();
    else onDone(r.label, r.checkId);
  }

  const busy = pending !== null;
  return (
    <article className="card-check fade-in flex flex-col gap-3" aria-labelledby={`q-${card.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
          <h2 className="text-[17px] leading-snug font-semibold">{card.title}</h2>
          <p className="text-[13px] text-ink-2">{card.reading}</p>
        </div>
        {card.chip}
      </div>
      {card.evidence}
      <p className="text-[13px] leading-snug text-ink-2">Why I ask: {q.why}</p>

      <p id={`q-${card.id}`} className="text-[18px] leading-snug font-bold">
        {q.question}
      </p>

      {naming ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) void send("rename", name.trim());
          }}
        >
          <label htmlFor={`name-${card.id}`} className="sr-only">
            What it is
          </label>
          <input
            id={`name-${card.id}`}
            className="field"
            placeholder="e.g. Beef chili"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            maxLength={80}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary btn-sm flex-1" disabled={busy || !name.trim()}>
              {pending === "rename" ? "Saving..." : "Save name"}
            </button>
            {q.kind !== "identify" && (
              <button type="button" className="btn btn-sm" disabled={busy} onClick={() => setNaming(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {q.answers.map((a) => (
            <button
              key={a.value}
              type="button"
              disabled={busy}
              onClick={() => (a.value === "rename" ? setNaming(true) : void send(a.value))}
              className={`${a.primary ? "btn-primary" : "btn"} btn-sm ${q.answers.length === 3 && a.value === "unsure" ? "col-span-2" : ""}`}
            >
              {pending === a.value ? "Saving..." : a.label}
            </button>
          ))}
        </div>
      )}

      <div className="-mb-1 flex flex-wrap items-center gap-x-1 border-t border-line pt-2">
        {q.kind !== "owner" && (
          <button type="button" disabled={busy} onClick={() => void send("not_mine")} className="min-h-[44px] rounded-lg px-2 text-[14px] font-semibold active:bg-fill">
            Not mine
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => void send("not_here")} className="min-h-[44px] rounded-lg px-2 text-[14px] font-semibold active:bg-fill">
          Not in my fridge
        </button>
        {canSkip && (
          <button type="button" disabled={busy} onClick={() => void send("skip")} className="ml-auto min-h-[44px] rounded-lg px-2 text-[14px] text-ink-2 active:bg-fill">
            Skip for now
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-[14px] font-semibold">
          {error}
        </p>
      )}
    </article>
  );
}
