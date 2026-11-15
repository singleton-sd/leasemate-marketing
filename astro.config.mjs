// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

const environment = /** @type {Record<string, string | undefined>} */ (
  Reflect.get(globalThis, "process")?.env ?? {}
);

export default defineConfig({
  site: "https://leasemate.singletonsd.com",
  base: environment.PREVIEW_BASE_PATH ?? "/",
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
