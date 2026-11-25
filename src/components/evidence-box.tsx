import type { ItemView } from "@/lib/data/items";
import { cropStyle } from "@/lib/crop";
import { formatMoment } from "@/lib/time";

const SOURCE: Record<NonNullable<ItemView["scanSource"]>, string> = {
  video: "Video",
  photo: "Fridge photo",
  receipt: "Receipt",
  typed: "Typed",
};

/** "VIDEO, TOP SHELF" style label for where an item was seen. */
export function evidenceLabel(item: Pick<ItemView, "scanSource" | "evidence">): string {
  return [item.scanSource ? SOURCE[item.scanSource] : "Added by you", item.evidence.where].filter(Boolean).join(", ");
}

/** Where an item came from, with time: "Video, Sun 7:42 pm, middle shelf". */
export function sourceLine(item: Pick<ItemView, "scanSource" | "scanAt" | "addedAt" | "evidence">): string {
  const source = item.scanSource ? SOURCE[item.scanSource] : "Added";
  return [source, formatMoment(item.scanAt ?? item.addedAt), item.evidence.where].filter(Boolean).join(", ");
}

/** A square crop of the photo around the item (N2). */
export function PhotoCrop({ item, size = 88 }: { item: Pick<ItemView, "media" | "evidence" | "name">; size?: number }) {
  if (!item.media) return null;
  const style = cropStyle(item.media.width, item.media.height, item.evidence.box);
  return (
    <div
      role="img"
      aria-label={`Photo of ${item.name}`}
      className="shrink-0 rounded-lg bg-line bg-no-repeat"
      style={{ width: size, height: size, backgroundImage: `url(/api/media/${item.media.id})`, ...style }}
    />
  );
}

/** Gray box with the photo crop or the text the recognizer read (N2: evidence on every scanned item). */
export function EvidenceBox({ item }: { item: ItemView }) {
  const text = item.evidence.text;
  return (
    <div className="flex gap-3 rounded-[10px] bg-fill p-3">
      <PhotoCrop item={item} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-2 uppercase">{evidenceLabel(item)}</p>
        {text ? (
          <p className="text-[14px] leading-snug break-words">
            {item.scanSource === "receipt" ? "Receipt line: " : ""}&quot;{text}&quot;
          </p>
        ) : (
          <p className="text-[14px] leading-snug text-ink-2">{item.media ? "Seen in the photo." : "No photo or label text."}</p>
        )}
      </div>
    </div>
  );
}
