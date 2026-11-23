/** Answers on 14 (update 10). Stored on the planned meal as the label. */
export const SKIP_REASONS = { eating_out: "Eating out", too_tired: "Too tired to cook", not_hungry: "Not hungry" } as const;
export type SkipReason = keyof typeof SKIP_REASONS;
