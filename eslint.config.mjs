import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: ['app/**/*.{js,jsx,mjs}', 'components/**/*.{js,jsx,mjs}', 'lib/**/*.{js,jsx,mjs}'],
    rules: { 'no-console': 'error' },
  },
  {
    files: ['lib/diagnostics.mjs'],
    rules: { 'no-console': ['error', { allow: ['error', 'warn'] }] },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
