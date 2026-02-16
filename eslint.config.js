import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "server/src/generated/**",
      "client/src/components/ui/**",
    ],
  },

  // Base config for all TS files
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Shared rule overrides
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Not a standard rule; catch-and-rethrow with context is valid
      "preserve-caught-error": "off",
    },
  },

  // Relax rules for test files
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Server-specific config
  {
    files: ["server/src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Client-specific config
  {
    files: ["client/src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // These React Compiler rules are too strict for intentional state-sync patterns
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
    },
  },

  // Disable rules that conflict with Prettier
  prettier,
);
