import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build-/Design-Tooling (gitignored, kein App-Code):
    ".claude/**",
    ".impeccable/**",
  ]),
  {
    rules: {
      // `_`-Präfix markiert bewusst ungenutzte Parameter — z. B. die von
      // useActionState vorgegebenen (_prevState, _formData)-Signaturen.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Design guardrails (DESIGN.md §6). Keep the two AI-tell patterns from
      // creeping back into className strings.
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/uppercase\\s+tracking-/]",
          message:
            "Tracked-uppercase eyebrow is banned (DESIGN.md §6). Use <SectionLabel> (Fraunces micro-heading) instead.",
        },
        {
          selector: "Literal[value=/border-[lr]-[2-9]/]",
          message:
            "Side-stripe border >1px is banned (DESIGN.md §6). Use a full hairline ring/fill and carry state with an icon or badge.",
        },
      ],
    },
  },
]);

export default eslintConfig;
