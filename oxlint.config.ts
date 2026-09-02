import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import next from "ultracite/oxlint/next";
import nextJsPlugins from "ultracite/oxlint/next/js-plugins";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";
import vitest from "ultracite/oxlint/vitest";

const jsPlugins = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  extends: [
    core,
    react,
    next,
    vitest,
    tanstack,
    nextJsPlugins,
    tanstackJsPlugins,
    antiSlop,
    jsPlugins,
  ],
  ignorePatterns: [
    ...core.ignorePatterns,
    "components/ui/**",
    "hooks/use-mobile.ts",
  ],
  jsPlugins: jsPlugins.jsPlugins,
  rules: {
    "anti-slop/no-unknown-parameters": "off",
    "eslint/arrow-body-style": "off",
    "eslint/func-style": "off",
    "eslint/no-use-before-define": "off",
    "eslint/require-unicode-regexp": "off",
    "promise/avoid-new": "off",
    "promise/prefer-await-to-then": "off",
    "react-doctor/nextjs-missing-metadata": "off",
    "react-doctor/no-giant-component": "off",
    "react-doctor/no-initialize-state": "off",
    "react-doctor/react-compiler-no-manual-memoization": "off",
    "react-doctor/use-lazy-motion": "off",
    "react/function-component-definition": "off",
    "react/jsx-no-constructed-context-values": "off",
    "react/no-unescaped-entities": "off",
    "react/set-state-in-effect": "off",
    "vitest/consistent-test-filename": "off",
  },
  settings: jsPluginSettings,
});
