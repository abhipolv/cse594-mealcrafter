import "server-only";
import type { Recognition, RecognizeInput, SuggestedMeal, SuggestInput } from "./types";
import { mockRecognize, mockSuggest } from "./mock";

// AI_MODE=mock (default) returns recorded responses: free, deterministic, and
// what CI and teammates use. AI_MODE=live calls the Anthropic API.
export function aiMode(): "mock" | "live" {
  return process.env.AI_MODE === "live" ? "live" : "mock";
}

export type ProviderResult<T> = { value: T; model: string };

export async function recognize(input: RecognizeInput): Promise<ProviderResult<Recognition>> {
  if (aiMode() === "mock") return { value: mockRecognize(input), model: "mock" };
  const { liveRecognize } = await import("./anthropic");
  return liveRecognize(input);
}

export async function suggest(input: SuggestInput): Promise<ProviderResult<SuggestedMeal[]>> {
  if (aiMode() === "mock") return { value: mockSuggest(input), model: "mock" };
  const { liveSuggest } = await import("./anthropic");
  return liveSuggest(input);
}
