import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["lib/index.ts"],
    format: ["esm", "cjs"], // Build for ESmodules and commonJS
    dts: true, // Generate declaration file (.d.ts)
    splitting: false,
    sourcemap: false,
    clean: true,
    minify: true,
    treeshake: true, // Enable tree shaking to remove unused code
    external: ["zod"], // Mark zod as external dependency
});