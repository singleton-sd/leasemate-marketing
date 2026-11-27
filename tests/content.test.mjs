import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const homePath = new URL("../src/content/pages/home.md", import.meta.url);
const contactPath = new URL("../src/content/pages/contact.md", import.meta.url);
const waitlistPath = new URL(
  "../src/content/pages/waitlist.md",
  import.meta.url,
);
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
  assert.match(content, /Being built in Victoria\. Not a live app yet\./);
  assert.match(content, /Properties and rooms/);
  assert.match(content, /Let a whole house, or let it room by room/);
  assert.match(content, /Victorian contracts/);
  assert.match(content, /official CAV Form 1 for up to six renters/);
  assert.match(content, /prescribed wording stays locked/);
  assert.match(
    content,
    /Room sublets use a room agreement for one or two occupants/,
  );
  assert.match(content, /From lead to agreement/);
  assert.match(content, /Electronic signing is planned, not live yet/);
  assert.match(content, /an owner or admin approves it before it goes out/);
  assert.match(content, /ID before signing/);
  assert.match(
    content,
    /Every occupant's ID is verified before the agreement can be sent for signing/,
  );
  assert.match(content, /Bond lodging/);
  assert.match(content, /marked as lodged/);
  assert.match(content, /links out to the RTBA/);
  assert.match(content, /Lodging happens on the RTBA site, not in the app/);
  assert.match(content, /Waitlist, not self-serve yet/);
  assert.doesNotMatch(content, /Copy will tighten as the product owner/);
  assert.doesNotMatch(content, /Shared lease record/);
  assert.doesNotMatch(content, /Tenant and landlord paths/);
  assert.doesNotMatch(content, /Identity documents later/);
});

test("marketing pages do not overstate the 23 Nov MVP", async () => {
  const files = [homePath, featuresPath, pricingPath];
  const banned = [
    /\broom or bed\b/i,
    /\bbeds?\b/i,
    /Bed agreement/i,
    /\blet a bed\b/i,
    /\binspection/i,
    /condition[ -]?report/i,
    /Documenso/i,
    /Form 7/i,
    /rooming[ -]house/i,
    /Identity documents are collected/i,
    /RTBA integration/i,
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

test("contact content exposes opening-soon copy and no mailbox", async () => {
  const content = await readFile(contactPath, "utf8");
  assert.match(content, /^template: contact$/m);
  assert.match(content, /Talk to us about LeaseMate\./);
  assert.match(content, /Contact form opening soon/);
  assert.match(
    content,
    /The contact form is temporarily closed\. Check back here soon\./,
  );
  assert.doesNotMatch(content, /hello@/);
  assert.doesNotMatch(content, /mailto:/);
});

test("waitlist content exposes opening-soon copy and no mailbox", async () => {
  const content = await readFile(waitlistPath, "utf8");
  assert.match(content, /^template: waitlist$/m);
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
    waitlistPath,
    pricingPath,
    privacyPath,
    termsPath,
    new URL("../src/layouts/BaseLayout.astro", import.meta.url),
    new URL("../src/components/SiteFooter.astro", import.meta.url),
    new URL("../src/pages/contact.astro", import.meta.url),
    new URL("../src/pages/waitlist.astro", import.meta.url),
    new URL("../src/components/ContactForm.astro", import.meta.url),
    new URL("../src/components/ContactFormIsland.tsx", import.meta.url),
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
