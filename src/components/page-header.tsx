import type { ReactNode } from "react";
import { BackLink } from "./back-link";

/** Back link (optional), right-hand slot such as "1 / 4", title and one-line subtitle. */
export function PageHeader({
  back,
  backLabel,
  right,
  title,
  subtitle,
  children,
}: {
  back?: string;
  backLabel?: string;
  right?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      {(back || right) && (
        <div className="flex min-h-[44px] items-center justify-between">
          {back ? <BackLink href={back} label={backLabel} /> : <span />}
          {right}
        </div>
      )}
      {children}
      <h1 className="text-[26px] leading-[1.2] font-bold text-balance">{title}</h1>
      {subtitle && <p className="text-[15px] leading-snug text-ink-2">{subtitle}</p>}
    </header>
  );
}
