import Link from "next/link";
import { Icon } from "./icons";

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="-ml-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg pr-3 pl-1 text-[15px] font-semibold active:bg-fill"
    >
      <Icon name="chevron-left" size={20} />
      {label}
    </Link>
  );
}
