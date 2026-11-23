import Link from "next/link";
import type { ItemView } from "@/lib/data/items";
import { itemTitle, STATE_LABEL, expiryOf, urgencyOf } from "@/lib/items";
import { relativeDay } from "@/lib/time";
import { Icon } from "./icons";

/** Use-by chip: "Use by Thu", "Use by ~Thu" for a FoodKeeper estimate, maize when it is close or past. */
export function UseByChip({ item, today }: { item: ItemView; today: string }) {
  const u = expiryOf(item);
  const urgency = urgencyOf(u.day, today);
  if (!u.day) return <span className="tag text-ink-2">No date</span>;
  const day = relativeDay(u.day, today);
  const text = urgency === "past" ? "Past use-by" : `Use by ${u.estimated ? "~" : ""}${day}`;
  return <span className={urgency === "ok" ? "tag" : "chip-maize"}>{text}</span>;
}

/** One fridge item as a tappable card (06), linking to its detail (G13). */
export function ItemRow({
  item,
  today,
  detail,
  muted = false,
  right,
}: {
  item: ItemView;
  today: string;
  detail?: string;
  muted?: boolean;
  right?: React.ReactNode;
}) {
  const sub = detail ?? [STATE_LABEL[item.state], item.state === "frozen" ? null : item.evidence.where].filter(Boolean).join(", ");
  return (
    <li>
      <Link
        href={`/fridge/${item.id}`}
        className={`card pressable flex min-h-[64px] items-center gap-3 !py-3 ${muted ? "border-line" : ""}`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={`truncate text-[16px] font-semibold ${muted ? "text-ink-2" : ""}`}>
            {item.state === "frozen" && <Icon name="snowflake" size={14} className="mr-1 inline -translate-y-px" />}
            {itemTitle(item)}
          </span>
          <span className="truncate text-[13px] text-ink-2">{sub}</span>
        </span>
        {right ?? <UseByChip item={item} today={today} />}
        <Icon name="chevron-right" size={18} className="shrink-0 text-ink-2" />
      </Link>
    </li>
  );
}
