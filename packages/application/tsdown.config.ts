import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    todos: "src/todos/index.ts",
    messaging: "src/messaging/index.ts",
    events: "src/events/index.ts",
    evidence: "src/evidence/index.ts",
    review: "src/review/index.ts",
    territory: "src/territory/index.ts",
    help: "src/help/index.ts",
    sources: "src/sources/index.ts",
  },

  exports: {
    devExports: true,
  },
  format: ["esm"],

  outDir: "dist",
  clean: true,
  sourcemap: true,

  dts: true,

  external: [],

  target: "es2022",

  treeshake: true,
  minify: false,
});
