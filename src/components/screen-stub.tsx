// Placeholder for a screen that is not built yet. It tells whoever picks the
// screen up where its design lives and which Stage 2 updates it must include.
import Link from "next/link";
import { screen as getScreen, figmaUrl } from "@/lib/screens";
import { ScreenView } from "./screen-view";
import { BackLink } from "./back-link";

export function ScreenStub({ code, back = "/" }: { code: string; back?: string }) {
  const s = getScreen(code);
  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pb-8 pt-4">
      <ScreenView code={code} />
      {!s.tab && <BackLink href={back} />}
      <h1 className="text-[28px] font-bold leading-tight">{s.title}</h1>
      <div className="card-check flex flex-col gap-2 text-[15px]">
        <p className="font-semibold">Not built yet ({s.code})</p>
        <p>Track: {s.track}</p>
        {s.updates.length > 0 && <p>Stage 2 updates to include: {s.updates.join(", ")}</p>}
        {s.notes && <p className="text-ink-2">{s.notes}</p>}
        <Link href={figmaUrl(s.figmaNode)} className="underline" target="_blank">
          Open the Figma frame
        </Link>
      </div>
    </main>
  );
}
