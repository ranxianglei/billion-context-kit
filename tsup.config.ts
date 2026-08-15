import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  // acp-kernel is a runtime dependency and stays external; adapters bundle
  // both kit and kernel inline via their own tsup config (zero runtime deps
  // in adapter dist is the adapter's guarantee, not ours).
});
