"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { suggestMeals } from "@/lib/meals";

export type CookState = { error?: string };

const Input = z.object({
  minutes: z.coerce.number().int().refine((n) => [15, 20, 30, 45].includes(n)),
  readyOnly: z.boolean(),
  allowReserved: z.boolean(),
  forDay: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
});

/** 08 "Show meals": asks for suggestions through the rule filter and opens 09 with the result. */
export async function findMeals(_prev: CookState, formData: FormData): Promise<CookState> {
  const user = await requireUser();
  const parsed = Input.safeParse({
    minutes: formData.get("minutes"),
    readyOnly: formData.get("readyOnly") === "on",
    allowReserved: formData.get("allowReserved") === "1",
    forDay: formData.get("forDay") ?? "",
  });
  if (!parsed.success) return { error: "Pick how much time you have." };
  let id: string;
  try {
    const r = await suggestMeals(user.id, {
      minutes: parsed.data.minutes,
      readyOnly: parsed.data.readyOnly,
      allowReserved: parsed.data.allowReserved,
      forDay: parsed.data.forDay || undefined,
    });
    id = r.suggestionId;
  } catch (err) {
    console.error("suggestMeals failed", err);
    return { error: "I couldn't get meal ideas right now. Try again in a moment." };
  }
  redirect(`/cook/results?s=${id}`);
}
