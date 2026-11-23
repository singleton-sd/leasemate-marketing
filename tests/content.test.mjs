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
const privacyContentPath = new URL(
  "../src/content/pages/privacy.md",
  import.meta.url,
);
const termsContentPath = new URL(
  "../src/content/pages/terms.md",
  import.meta.url,
);

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

test("privacy and terms render draft legal content collections", async () => {
  const privacyPage = await readFile(privacyPath, "utf8");
  const termsPage = await readFile(termsPath, "utf8");
  const privacy = await readFile(privacyContentPath, "utf8");
  const terms = await readFile(termsContentPath, "utf8");

  assert.match(privacyPage, /getEntry\("pages", "privacy"\)/);
  assert.match(privacyPage, /noindex,follow/);
  assert.match(privacyPage, /legal-section/);
  assert.match(termsPage, /getEntry\("pages", "terms"\)/);
  assert.match(termsPage, /noindex,follow/);
  assert.match(termsPage, /legal-section/);
  assert.doesNotMatch(privacyPage, /Full text is coming soon\./);
  assert.doesNotMatch(termsPage, /Full text is coming soon\./);

  assert.match(privacy, /^template: privacy$/m);
  assert.match(privacy, /^draft: true$/m);
  assert.match(
    privacy,
    /description: "How LeaseMate collects, uses, stores and protects personal information\."/,
  );
  assert.match(privacy, /\[PLACEHOLDER: ACN\]/);
  assert.match(privacy, /> \*\*.*legal review.*\*\*/i);
  assert.match(terms, /^template: terms$/m);
  assert.match(terms, /^draft: true$/m);
  assert.match(
    terms,
    /description: "The terms that apply when you use LeaseMate\."/,
  );
  assert.match(terms, /\[Privacy Policy\]\(\/privacy\)/);
  assert.match(terms, /\[pricing page\]\(\/pricing\)/);
  assert.match(terms, /\[PLACEHOLDER: ACN\]/);
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
