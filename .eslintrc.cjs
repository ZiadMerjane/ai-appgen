/* eslint-env node */
module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "prettier"],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
  settings: {
    next: {
      rootDir: ["./"],
    },
  },
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      env: {
        node: true,
      },
    },
  ],
};
