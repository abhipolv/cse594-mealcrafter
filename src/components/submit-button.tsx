"use client";
import { useFormStatus } from "react-dom";

/** A form's submit button that says what is happening while the server works. */
export function SubmitButton({
  children,
  pending,
  className = "btn-primary w-full",
  name,
  value,
  disabled,
}: {
  children: React.ReactNode;
  pending?: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const status = useFormStatus();
  const mine = status.pending && (name === undefined || status.data?.get(name) === value);
  return (
    <button type="submit" name={name} value={value} disabled={disabled || status.pending} aria-busy={mine} className={className}>
      {mine && pending ? pending : children}
    </button>
  );
}
