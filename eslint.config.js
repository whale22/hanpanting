const sharedGlobals = {
  Buffer: "readonly",
  Headers: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  console: "readonly",
  process: "readonly",
  setTimeout: "readonly"
};

export default [
  {
    ignores: ["dist/**", "node_modules/**", ".npm-cache/**", "coverage/**"]
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      sourceType: "module",
      globals: sharedGlobals
    },
    rules: {
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-undef": "error",
      "no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "prefer-const": "error"
    }
  }
];
