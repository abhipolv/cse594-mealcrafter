import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  RecognitionSchema,
  SuggestionSchema,
  type Recognition,
  type RecognizeInput,
  type SuggestedMeal,
  type SuggestInput,
} from "./types";
import type { ProviderResult } from "./index";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const RECOGNIZER_MODEL = process.env.RECOGNIZER_MODEL ?? "claude-opus-5-5";
const SUGGESTER_MODEL = process.env.SUGGESTER_MODEL ?? "claude-sonnet-5-5";

// Server-side refusal fallback (on by default for Opus 5.5 / Sonnet 5.5; Haiku
// has none). It re-runs a declined request on another model inside one call.
function fallbackParams(model: string) {
  if (model.startsWith("claude-haiku")) return {};
  return {
    betas: ["server-side-fallback-2026-07-01" as const],
    fallbacks: "default" as const,
  };
}

export class AiRefusalError extends Error {}

const RECOGNIZER_SYSTEM = `You are the food recognizer in MealCrafter, a meal planning app for students.
You receive images of one person's refrigerator (video frames or photos) or a grocery receipt.
List the food items you can see. Your list will be shown to the user, who checks uncertain items before they are used in meals.

Rules:
- Precision matters more than completeness. An item listed that is not really there causes a failed meal. If you cannot tell what something is, put it in "unclear" instead of guessing a name.
- The same item often appears in several frames. List it once, using the image where it is clearest.
- Set confidence to "high" only when the item is plainly identifiable. Use "cant_see" for wrapped, opaque or hidden food.
- may_contain: list every rule tag the item could plausibly contain, judged from what it is (pesto -> tree_nuts, granola -> tree_nuts, sausage -> pork). Be cautious.
- contents_known is true only when a label is readable or the food is a single plain ingredient (eggs, a bell pepper).
- evidence_text: copy label or receipt text exactly as printed. Never invent text.
- check_reason: set it when the user should confirm something (low confidence, unknown contents that could matter for the user's rules, unclear ownership in a shared fridge). Keep it to one short line.
- Do not describe medication, supplements, or other private non-food items. Count them in skipped_private and nothing else.
- Never say whether food is safe to eat or spoiled.`;

function describeRules(tags: string[]) {
  return tags.length ? `The user's food rules (tags): ${tags.join(", ")}.` : "The user recorded no food rules.";
}

export async function liveRecognize(input: RecognizeInput): Promise<ProviderResult<Recognition>> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  input.images.forEach((img, i) => {
    content.push({ type: "text", text: `Image ${i}:` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data.toString("base64") },
    });
  });
  content.push({
    type: "text",
    text: `Source: ${input.source}. ${describeRules(input.ruleTags)} List the items.`,
  });

  const response = await client.beta.messages.parse({
    model: RECOGNIZER_MODEL,
    max_tokens: 16000,
    system: RECOGNIZER_SYSTEM,
    messages: [{ role: "user", content }],
    output_config: { format: betaZodOutputFormat(RecognitionSchema), effort: "medium" },
    ...fallbackParams(RECOGNIZER_MODEL),
  });

  if (response.stop_reason === "refusal") throw new AiRefusalError("The recognizer declined this image.");
  if (!response.parsed_output) throw new Error(`Recognizer returned no parsable output (${response.stop_reason})`);
  return { value: response.parsed_output, model: response.model };
}

const SUGGESTER_SYSTEM = `You are the meal suggester in MealCrafter, a meal planning app for students who cook with limited time and money.
Suggest simple dinners the user can cook tonight from the inventory given.

Rules:
- Use inventory items by their id (item_id). An ingredient not in the inventory gets item_id null and counts toward extra_cost_cents.
- Prefer items with the earliest use-by dates.
- Respect the time limit. Count pans honestly.
- Never use an ingredient that conflicts with the user's food rules. A separate check will remove any meal that does, so a conflicting meal is wasted.
- Keep steps short and concrete. No claims that food is safe or fresh.`;

export async function liveSuggest(input: SuggestInput): Promise<ProviderResult<SuggestedMeal[]>> {
  const inventory = input.inventory
    .map((i) => `- id=${i.id} | ${i.name}${i.quantity ? ` (${i.quantity})` : ""} | ${i.state}${i.useBy ? ` | use by ${i.useBy}` : ""}`)
    .join("\n");
  const prompt = `Time available: ${input.minutes} minutes.
${input.readyOnly ? "Use only food that is ready to cook now (nothing frozen)." : "Frozen food may be used if it can thaw in time."}
Food rules: ${input.ruleLabels.length ? input.ruleLabels.join(", ") : "none"}.
Suggest ${input.count} different meals.

Inventory:
${inventory}`;

  const response = await client.beta.messages.parse({
    model: SUGGESTER_MODEL,
    max_tokens: 16000,
    system: SUGGESTER_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: betaZodOutputFormat(SuggestionSchema), effort: "low" },
    ...fallbackParams(SUGGESTER_MODEL),
  });

  if (response.stop_reason === "refusal") throw new AiRefusalError("The suggester declined this request.");
  if (!response.parsed_output) throw new Error(`Suggester returned no parsable output (${response.stop_reason})`);
  return { value: response.parsed_output.meals, model: response.model };
}
