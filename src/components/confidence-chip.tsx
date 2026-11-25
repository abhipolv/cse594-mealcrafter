import { CONFIDENCE, type Confidence } from "@/lib/items";

// Update 4: each confidence level looks different, not only by its words. A
// three-bar meter shows the level; anything short of high sits on maize,
// "can't see" also gets a dashed edge like other things waiting on the user.
export function ConfidenceChip({ level }: { level: Confidence }) {
  const { label, bars } = CONFIDENCE[level];
  const tone =
    level === "high"
      ? "border-[1.5px] border-ink bg-paper"
      : level === "cant_see"
        ? "border-[1.5px] border-dashed border-ink bg-maize"
        : "border-[1.5px] border-maize bg-maize";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap ${tone}`}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-[3px] rounded-[1px] ${i < bars ? "bg-ink" : "bg-ink/25"}`}
            style={{ height: 5 + i * 3 }}
          />
        ))}
      </span>
      {label}
    </span>
  );
}
