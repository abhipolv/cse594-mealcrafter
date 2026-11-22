// Contracts for the two AI components named in the model card. Both the mock
// and live providers return exactly these shapes, so screens never care which
// one ran. Structured outputs need every field present, so "missing" is null.
import { z } from "zod";
import { RULE_TAGS } from "@/lib/rules/taxonomy";

const RuleTagSchema = z.enum(RULE_TAGS);

// ---------- Food recognizer ----------

export const RecognizedItemSchema = z.object({
  name: z.string().describe("Short everyday name, e.g. 'Basil pesto', 'Bell peppers'"),
  quantity: z.string().nullable().describe("Count or amount if visible, e.g. 'x7', 'half full'"),
  state: z.enum(["raw", "cooked", "leftover", "frozen", "pantry"]),
  where: z.string().nullable().describe("Location, e.g. 'top shelf', 'door', 'left drawer'"),
  confidence: z.enum(["high", "medium", "low", "cant_see"]),
  may_contain: z.array(RuleTagSchema).describe("Rule tags this item may contain"),
  contents_known: z
    .boolean()
    .describe("True only if a readable label or the item itself settles what it contains"),
  evidence_text: z.string().nullable().describe("Label or receipt text actually read, verbatim"),
  image_index: z.number().int().describe("Index of the image the item is best seen in"),
  box: z
    .object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() })
    .nullable()
    .describe("Approximate box as fractions (0 to 1) of that image, top-left origin"),
  check_reason: z
    .string()
    .nullable()
    .describe("If the user should check this item, the one-line reason; otherwise null"),
});

export const RecognitionSchema = z.object({
  items: z.array(RecognizedItemSchema),
  unclear: z
    .array(z.object({ description: z.string(), where: z.string().nullable(), image_index: z.number().int() }))
    .describe("Things seen but not identifiable, e.g. 'bag behind the jam'"),
  skipped_private: z
    .number()
    .int()
    .describe("Count of medication or other private items deliberately not described"),
});

export type RecognizedItem = z.infer<typeof RecognizedItemSchema>;
export type Recognition = z.infer<typeof RecognitionSchema>;

export type RecognizeInput = {
  /** JPEG images (video frames, photos or a receipt), already resized on the phone. */
  images: { data: Buffer; mediaType: "image/jpeg" | "image/png" }[];
  source: "video" | "photo" | "receipt";
  /** The user's rule tags, so the recognizer can flag items that may contain them. */
  ruleTags: string[];
};

// ---------- Meal suggester ----------

export const SuggestedMealSchema = z.object({
  title: z.string(),
  minutes: z.number().int(),
  pans: z.number().int(),
  servings: z.number().int(),
  leftovers: z.string().nullable(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      quantity: z.string().nullable(),
      item_id: z.string().nullable().describe("Inventory id this ingredient comes from, or null if not in the fridge"),
    }),
  ),
  steps: z.array(z.string()),
  extra_cost_cents: z.number().int().nullable().describe("Cost of anything not already in the fridge"),
  why: z.string().describe("One line: why this meal fits tonight"),
});

export const SuggestionSchema = z.object({ meals: z.array(SuggestedMealSchema) });

export type SuggestedMeal = z.infer<typeof SuggestedMealSchema>;

export type SuggestInput = {
  minutes: number;
  readyOnly: boolean;
  ruleLabels: string[];
  inventory: { id: string; name: string; quantity: string | null; state: string; useBy: string | null }[];
  count: number;
};
