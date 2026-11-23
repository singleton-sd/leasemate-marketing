import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("waitlist page uses shared chrome and the waitlist form island", async () => {
  const page = await readFile(
    new URL("src/pages/waitlist.astro", root),
    "utf8",
  );
  const content = await readFile(
    new URL("src/content/pages/waitlist.md", root),
    "utf8",
  );
  const island = await readFile(
    new URL("src/components/WaitlistFormIsland.tsx", root),
    "utf8",
  );
  const form = await readFile(
    new URL("src/components/WaitlistForm.astro", root),
    "utf8",
  );

  assert.match(page, /BaseLayout/);
  assert.match(page, /WaitlistForm/);
  assert.match(content, /^template: waitlist$/m);
  assert.match(content, /Join the LeaseMate waitlist/);
  assert.match(content, /Waitlist opening soon/);
  assert.match(island, /formType: "waitlist"/);
  assert.match(island, /TurnstileWidget/);
  assert.match(island, /marketingOptIn/);
  assert.match(form, /PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(form, /PUBLIC_LEAD_INTAKE_ENABLED/);
  assert.match(form, /data-waitlist-opening-soon/);
  assert.doesNotMatch(island, /PostKit/);
  assert.doesNotMatch(form, /resolve-postkit-api-base-url/);
  assert.doesNotMatch(page, /hello@|mailto:|support@/);
  assert.doesNotMatch(content, /hello@|mailto:|support@/);
  assert.doesNotMatch(island, /hello@|mailto:|support@/);
  assert.doesNotMatch(form, /hello@|mailto:|support@/);
});
