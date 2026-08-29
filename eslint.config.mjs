import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-img-element": "off"
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local Supabase CLI cache, not part of the app.
    "supabase/.temp/**",
    "supabase/.branches/**",
    // Playwright/Vitest output, not source.
    "playwright-report/**",
    "test-results/**",
    // One-off Node scripts, not part of the Next.js app.
    "capture_ui.js",
    "seed.js",
    // Claude Code local tool state: git worktrees live under here, nested
    // inside the main checkout, each with its own node_modules/.next/build
    // output. The patterns above only match at the repo root, not nested
    // occurrences inside this directory, so it needs its own ignore.
    ".claude/**",
  ]),
]);

export default eslintConfig;
