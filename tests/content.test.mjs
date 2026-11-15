import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homePath = new URL("../src/content/pages/home.md", import.meta.url);
const contactPath = new URL("../src/content/pages/contact.md", import.meta.url);
const pricingPath = new URL("../src/content/pages/pricing.md", import.meta.url);
const privacyPath = new URL("../src/pages/privacy.astro", import.meta.url);
const termsPath = new URL("../src/pages/terms.astro", import.meta.url);

test("home content contains the required public fields", async () => {
  const content = await readFile(homePath, "utf8");
  for (const field of [
    "template",
    "title",
    "description",
    "headline",
    "summary",
  ]) {
    assert.match(content, new RegExp(`^${field}: .+`, "m"));
  }
  assert.match(content, /^template: home$/m);
  assert.doesNotMatch(content, /\b(guaranteed|proven roi|industry-leading)\b/i);
});

test("contact waitlist content exposes opening-soon copy", async () => {
  const content = await readFile(contactPath, "utf8");
  assert.match(content, /^template: contact$/m);
  assert.match(content, /hello@leasemate\.singletonsd\.com/);
  assert.match(content, /Waitlist opening soon/);
});

test("pricing page is clearly a placeholder", async () => {
  const content = await readFile(pricingPath, "utf8");
  assert.match(content, /^placeholder: true$/m);
  assert.match(content, /not published yet|not ready to publish/i);
});

test("privacy and terms stubs say coming soon", async () => {
  const privacy = await readFile(privacyPath, "utf8");
  const terms = await readFile(termsPath, "utf8");
  assert.match(privacy, /Coming soon/);
  assert.match(terms, /Coming soon/);
});
