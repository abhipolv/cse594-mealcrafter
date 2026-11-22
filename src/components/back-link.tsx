import Link from "next/link";

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-block py-2 text-[15px]">
      {"< "}
      {label}
    </Link>
  );
}
