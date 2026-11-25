import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";

/**
 * A choice chip backed by a real checkbox or radio. Padding is the same with
 * or without the check mark, which sits in it, so chips never shift or grow
 * when selected (update 5, E2). `compact` chips fill a grid cell and show the
 * selection by fill alone.
 */
export function ChoiceChip({
  name,
  value,
  type = "checkbox",
  defaultChecked,
  children,
  onChange,
  checked,
  compact = false,
}: {
  name: string;
  value: string;
  type?: "checkbox" | "radio";
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <label className={`chip group relative cursor-pointer whitespace-nowrap ${compact ? "!px-1" : "!px-[30px]"}`}>
      <input
        type={type}
        name={name}
        value={value}
        className="sr-only"
        {...(checked !== undefined ? { checked } : { defaultChecked })}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
      />
      {!compact && <Icon name="check" size={16} className="absolute left-[10px] opacity-0 group-has-checked:opacity-100" />}
      {children}
    </label>
  );
}

/** Back link, "1 / 4" and the progress bar; in profile edit mode only the back link. */
export function SetupHeader({ step, title, back, fromProfile }: { step: number; title: string; back: string; fromProfile: boolean }) {
  return (
    <PageHeader
      back={fromProfile ? "/profile" : back}
      right={fromProfile ? undefined : <span className="text-[15px] text-ink-2 tabular-nums">{step} / 4</span>}
      title={title}
    >
      {!fromProfile && (
        <div className="mb-2 grid grid-cols-4 gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step} aria-label={`Step ${step} of 4`}>
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`h-1 rounded-full ${i <= step ? "bg-ink" : "bg-line"}`} />
          ))}
        </div>
      )}
    </PageHeader>
  );
}
