import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/** "#abc", "#aabbcc" or "#aabbccdd" anywhere in a string. */
const HEX = String.raw`/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z])/`;
const HEX_MESSAGE =
  "Raw hex colour: use a token from @nfe/ui (theme colours, tokens.brand) instead.";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.expo/**",
      "**/out/**",
      "**/coverage/**",
      "apps/mobile/android/**",
      "apps/mobile/ios/**",
      "apps/web/next-env.d.ts",
      "apps/mobile/expo-env.d.ts",
      "packages/core/src/types/database.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["apps/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["**/*.{js,cjs}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Colours come from design tokens (@nfe/ui); a raw hex colour anywhere else fails lint.
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    ignores: ["packages/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=${HEX}]`,
          message: HEX_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=${HEX}]`,
          message: HEX_MESSAGE,
        },
        {
          selector: `JSXText[value=${HEX}]`,
          message: HEX_MESSAGE,
        },
      ],
    },
  },
);
