"use client";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="code" className="font-semibold">
        Your study code
      </label>
      <input
        id="code"
        name="code"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        placeholder="e.g. p03-basil"
        className="h-12 rounded-[10px] border-[1.5px] border-ink px-3 text-lg"
      />
      {state.error && <p role="alert" className="text-sm">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Checking..." : "Continue"}
      </button>
    </form>
  );
}
