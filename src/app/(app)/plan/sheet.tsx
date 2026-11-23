import Link from "next/link";
import type { ReactNode } from "react";

/** 13 and 14: a bottom sheet over the dimmed week. The page behind cannot be used until the sheet closes. */
export function Sheet({ behind, children, label, closeHref = "/plan" }: { behind: ReactNode; children: ReactNode; label: string; closeHref?: string }) {
  return (
    <>
      <div inert className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-6 opacity-60" aria-hidden>
        {behind}
      </div>
      <div className="fixed inset-0 z-30 mx-auto flex max-w-[430px] flex-col justify-end">
        <Link href={closeHref} aria-label="Close" className="fade-in absolute inset-0 bg-ink/45" />
        <section role="dialog" aria-modal="true" aria-label={label} className="sheet relative flex max-h-[85dvh] flex-col gap-3 overflow-y-auto">
          <span className="mx-auto -mt-2 mb-1 h-1 w-10 rounded-full bg-line" aria-hidden />
          {children}
        </section>
      </div>
    </>
  );
}
