import next from "eslint-config-next";
import prettier from "eslint-config-prettier";

const config = [
  {
    ignores: ["node_modules", ".next", "supabase", "coverage"],
  },
  ...next,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      ...prettier.rules,
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    languageOptions: {
      globals: {
        vi: "readonly",
      },
    },
  },
];

export default config;
