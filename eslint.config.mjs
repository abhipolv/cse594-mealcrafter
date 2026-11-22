import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Meals must pass the rule filter before anyone sees them (N1).
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/ai",
              importNames: ["unfilteredSuggest"],
              message: "Use suggestMeals() from @/lib/meals, which runs the rule filter.",
            },
            {
              name: "@anthropic-ai/sdk",
              message: "Call models through @/lib/ai so mock mode and the rule filter keep working.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/meals.ts", "src/lib/ai/**"],
    rules: { "no-restricted-imports": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);

export default eslintConfig;
