import { defineConfig } from "tsdown";

export default defineConfig({
  format: "esm",
  outDir: "build",
  clean: true,
  minify: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
