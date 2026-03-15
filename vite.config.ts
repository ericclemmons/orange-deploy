import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    sortImports: {},
  },
  staged: {
    "*": "vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: true } },
});
