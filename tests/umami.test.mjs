import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import { TEST_UMAMI_WEBSITE_ID, UMAMI_DOMAINS } from "./umami-fixtures.mjs";

const root = new URL("../", import.meta.url);

test("every page under src/pages uses BaseLayout", async () => {
  const dir = new URL("src/pages/", root);
  const entries = await readdir(dir);
  const pages = entries.filter((name) => name.endsWith(".astro"));
  assert.ok(pages.length > 0, "expected Astro pages");
  for (const name of pages) {
    const source = await readFile(new URL(name, dir), "utf8");
    assert.match(
      source,
      /import BaseLayout from ["']\.\.\/layouts\/BaseLayout\.astro["']/,
      `${name} must use BaseLayout so Umami init runs on every page`,
    );
  }
});

test("site-wide Umami init uses analytics-kit and App Config website id", async () => {
  const widget = await readFile(
    new URL("src/components/UmamiAnalytics.astro", root),
    "utf8",
  );
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  const envExample = await readFile(new URL(".env.example", root), "utf8");
  const envTypes = await readFile(new URL("src/env.d.ts", root), "utf8");
  const pkg = await readFile(new URL("package.json", root), "utf8");
  const deployment = await readFile(
    new URL("docs/deployment.md", root),
    "utf8",
  );
  const readme = await readFile(new URL("README.md", root), "utf8");
  const pagesWorkflow = await readFile(
    new URL(".github/workflows/pages.yml", root),
    "utf8",
  );
  const previewWorkflow = await readFile(
    new URL(".github/workflows/preview.yml", root),
    "utf8",
  );

  assert.match(layout, /UmamiAnalytics/);
  assert.match(widget, /from ["']@singleton-sd\/analytics-kit["']/);
  assert.match(widget, /initAnalytics\(/);
  assert.match(widget, /PUBLIC_UMAMI_WEBSITE_ID/);
  assert.match(
    widget,
    new RegExp(`domains:\\s*["']${UMAMI_DOMAINS.replaceAll(".", "\\.")}["']`),
  );
  assert.equal(TEST_UMAMI_WEBSITE_ID, "728cb391-3289-40bc-b3f0-6230ecc412b5");
  assert.doesNotMatch(widget, /capture\(|get\(|submitLead\(/);
  assert.doesNotMatch(widget, /ssd:attribution/);
  assert.match(envExample, /PUBLIC_UMAMI_WEBSITE_ID=/);
  assert.match(envTypes, /PUBLIC_UMAMI_WEBSITE_ID/);
  assert.match(pkg, /"@singleton-sd\/analytics-kit":\s*"npmjs:0\.1\.0"/);
  assert.match(
    pkg,
    /"test:umami": "node --experimental-strip-types tests\/umami\.mjs"/,
  );
  assert.match(pagesWorkflow, /--key 'PUBLIC_\*'/);
  assert.match(previewWorkflow, /--key 'PUBLIC_\*'/);
  assert.match(pagesWorkflow, /pnpm test:umami/);
  assert.match(previewWorkflow, /pnpm test:umami/);
  assert.doesNotMatch(pagesWorkflow, /vars\.PUBLIC_UMAMI/);
  assert.doesNotMatch(previewWorkflow, /vars\.PUBLIC_UMAMI/);
  assert.doesNotMatch(pagesWorkflow, /secrets\.PUBLIC_UMAMI/);
  assert.doesNotMatch(previewWorkflow, /secrets\.PUBLIC_UMAMI/);
  assert.match(deployment, /PUBLIC_UMAMI_WEBSITE_ID/);
  assert.match(deployment, /728cb391-3289-40bc-b3f0-6230ecc412b5/);
  assert.match(deployment, /analytics\.singletonsd\.com/);
  assert.match(readme, /PUBLIC_UMAMI_WEBSITE_ID/);
  assert.match(readme, /@singleton-sd\/analytics-kit/);
});

test("Umami website id is not hardcoded in source", async () => {
  const files = [
    "src/components/UmamiAnalytics.astro",
    "src/layouts/BaseLayout.astro",
    ".env.example",
    ".github/workflows/pages.yml",
    ".github/workflows/preview.yml",
  ];
  for (const relative of files) {
    const source = await readFile(new URL(relative, root), "utf8");
    assert.doesNotMatch(
      source,
      /728cb391-3289-40bc-b3f0-6230ecc412b5/,
      `${relative} must not hardcode the Umami website id`,
    );
  }
});

test("lead intake and attribution stay independent of analytics init", async () => {
  const leadIntake = await readFile(
    new URL("src/lib/lead-intake.ts", root),
    "utf8",
  );
  const waitlist = await readFile(
    new URL("src/components/WaitlistFormIsland.tsx", root),
    "utf8",
  );
  const contact = await readFile(
    new URL("src/components/ContactFormIsland.tsx", root),
    "utf8",
  );
  const widget = await readFile(
    new URL("src/components/UmamiAnalytics.astro", root),
    "utf8",
  );
  assert.doesNotMatch(leadIntake, /@singleton-sd\/analytics-kit/);
  assert.doesNotMatch(waitlist, /@singleton-sd\/analytics-kit/);
  assert.doesNotMatch(contact, /@singleton-sd\/analytics-kit/);
  assert.doesNotMatch(leadIntake, /utmSource|ssd:attribution/);
  assert.doesNotMatch(widget, /localStorage/);
});
