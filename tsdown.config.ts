import { defineConfig } from "tsdown";

export default defineConfig({
  format: "esm",
  outDir: "build",
  clean: true,
  fixedExtension: false,
  minify: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
