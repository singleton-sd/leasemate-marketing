import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homePath = new URL("../src/content/pages/home.md", import.meta.url);
const contactPath = new URL("../src/content/pages/contact.md", import.meta.url);
const featuresPath = new URL(
  "../src/content/pages/features.md",
  import.meta.url,
);
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
  assert.match(content, /house owners and lease holders in Victoria/);
  assert.doesNotMatch(content, /\b(guaranteed|proven roi|industry-leading)\b/i);
});

test("features content uses the Victoria product cards", async () => {
  const content = await readFile(featuresPath, "utf8");
  assert.match(content, /house owners and lease holders in Victoria/);
  assert.match(content, /Properties, rooms and beds/);
  assert.match(content, /Victorian contracts/);
  assert.match(content, /From lead to signed lease/);
  assert.match(content, /ID when someone becomes a tenant/);
  assert.doesNotMatch(content, /Copy will tighten as the product owner/);
  assert.doesNotMatch(content, /Shared lease record/);
  assert.doesNotMatch(content, /Tenant and landlord paths/);
  assert.doesNotMatch(content, /Identity documents later/);
});

test("contact waitlist content exposes opening-soon copy", async () => {
  const content = await readFile(contactPath, "utf8");
  assert.match(content, /^template: contact$/m);
  assert.match(
    content,
    /Register your interest in LeaseMate and hear when early access opens\./,
  );
  assert.match(content, /Waitlist opening soon/);
  assert.match(
    content,
    /The waitlist form is temporarily closed\. Check back here soon\./,
  );
  assert.doesNotMatch(content, /hello@/);
  assert.doesNotMatch(content, /mailto:/);
});

test("pricing page is clearly a placeholder", async () => {
  const content = await readFile(pricingPath, "utf8");
  assert.match(content, /^placeholder: true$/m);
  assert.match(
    content,
    /Plans and packaging are still being worked out\. Nothing on this page is an offer\./,
  );
  assert.doesNotMatch(content, /self-serve billing/);
});

test("404 uses the shared page hero heading", async () => {
  const page = await readFile(
    new URL("../src/pages/404.astro", import.meta.url),
    "utf8",
  );
  assert.match(page, /PageHero/);
  assert.match(page, /Page not found/);
  assert.match(page, /eyebrow="404"/);
});

test("privacy and terms stubs say coming soon", async () => {
  const privacy = await readFile(privacyPath, "utf8");
  const terms = await readFile(termsPath, "utf8");
  assert.match(privacy, /Full text is coming soon\./);
  assert.match(terms, /Full text is coming soon\./);
});

test("retired audience and billing copy is gone from source pages", async () => {
  const files = [
    homePath,
    featuresPath,
    contactPath,
    pricingPath,
    privacyPath,
    termsPath,
    new URL("../src/layouts/BaseLayout.astro", import.meta.url),
    new URL("../src/components/SiteFooter.astro", import.meta.url),
    new URL("../src/pages/contact.astro", import.meta.url),
    new URL("../src/components/WaitlistForm.astro", import.meta.url),
    new URL("../src/components/WaitlistFormIsland.tsx", import.meta.url),
    new URL("../src/components/TurnstileWidget.tsx", import.meta.url),
    new URL("../README.md", import.meta.url),
  ];
  const banned = [
    /landlords and tenants/i,
    /Identity documents later/,
    /self-serve billing/i,
    /hello@/,
    /mailto:/,
    /[A-Za-z0-9._%+-]+@leasemate\.singletonsd\.com/,
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const pattern of banned) {
      assert.doesNotMatch(
        source,
        pattern,
        `${file.pathname} still matches ${pattern}`,
      );
    }
  }
});
