import type { NextConfig } from "next";

// Cache Components is off on purpose: nearly every MealCrafter screen reads the
// signed-in user's data, so pages render per request (the "previous model" in
// node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md).
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
