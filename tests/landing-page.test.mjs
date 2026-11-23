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
  const item = await readFile(
    new URL("src/components/FeatureItem.astro", root),
    "utf8",
  );
  assert.match(page, /FeatureGrid/);
  assert.match(page, /FeatureItem/);
  assert.match(item, /<h2>\{title\}<\/h2>/);
});

test("pricing page marks placeholder content", async () => {
  const page = await readFile(new URL("src/pages/pricing.astro", root), "utf8");
  assert.match(page, /placeholder-banner/);
  assert.match(page, /Placeholder — pricing is not final/);
});

test("privacy and terms pages use shared legal chrome", async () => {
  const privacy = await readFile(
    new URL("src/pages/privacy.astro", root),
    "utf8",
  );
  const terms = await readFile(new URL("src/pages/terms.astro", root), "utf8");
  const styles = await readFile(new URL("src/styles/global.css", root), "utf8");

  for (const page of [privacy, terms]) {
    assert.match(page, /BaseLayout/);
    assert.match(page, /legal-section/);
    assert.match(page, /legal-prose/);
    assert.match(page, /<Content \/>/);
  }
  assert.match(styles, /\.draft-notice/);
  assert.match(styles, /color:\s*#ffb300/i);
  assert.match(styles, /background:\s*#000000/i);
});
