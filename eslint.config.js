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
    ignores: ["node_modules/**", ".npm-cache/**", "coverage/**"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
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
