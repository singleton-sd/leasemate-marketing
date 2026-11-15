import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("home page uses shared chrome and waitlist CTA", async () => {
  const page = await readFile(new URL("src/pages/index.astro", root), "utf8");
  assert.match(page, /BaseLayout/);
  assert.match(page, /PageHero/);
  assert.match(page, /Join the waitlist/);
  assert.match(page, /\/features/);
});

test("features page renders the feature grid from CMS", async () => {
  const page = await readFile(
    new URL("src/pages/features.astro", root),
    "utf8",
  );
  assert.match(page, /FeatureGrid/);
  assert.match(page, /FeatureItem/);
});

test("pricing page marks placeholder content", async () => {
  const page = await readFile(new URL("src/pages/pricing.astro", root), "utf8");
  assert.match(page, /placeholder-banner/);
  assert.match(page, /Placeholder — pricing is not final/);
});
