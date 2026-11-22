import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-6 px-5 py-10">
      <div>
        <h1 className="text-[28px] font-bold leading-tight">MealCrafter</h1>
        <p className="mt-2 text-ink-2">Know what is in your fridge and what you can cook tonight.</p>
      </div>
      <LoginForm />
    </main>
  );
}
