import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Astro uses the production custom domain", async () => {
  const config = await readFile(new URL("astro.config.mjs", root), "utf8");
  assert.match(config, /site:\s*["']https:\/\/leasemate\.singletonsd\.com["']/);
});

test("Astro derives preview asset and home links from its base path", async () => {
  const config = await readFile(new URL("astro.config.mjs", root), "utf8");
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  const header = await readFile(
    new URL("src/components/SiteHeader.astro", root),
    "utf8",
  );
  assert.match(config, /PREVIEW_BASE_PATH/);
  assert.match(layout, /import\.meta\.env\.BASE_URL/);
  assert.match(header, /import\.meta\.env\.BASE_URL/);
});

test("Pages workflow deploys main without deleting active previews", async () => {
  const workflow = await readFile(
    new URL(".github/workflows/pages.yml", root),
    "utf8",
  );
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /JamesIves\/github-pages-deploy-action@v4\.8\.0/);
  assert.match(workflow, /branch:\s*gh-pages/);
  assert.match(workflow, /clean-exclude:\s*pr-preview/);
  assert.doesNotMatch(workflow, /secrets\./);
  assert.match(workflow, /PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(workflow, /PUBLIC_LEAD_INTAKE_ENABLED/);
  assert.match(workflow, /Require Turnstile site key when lead intake is on/);
  assert.doesNotMatch(workflow, /PUBLIC_POSTKIT_API_BASE_URL/);
  assert.doesNotMatch(workflow, /azure\/login/);
});

test("PR workflow publishes subpath previews and updates the PR body", async () => {
  const workflow = await readFile(
    new URL(".github/workflows/preview.yml", root),
    "utf8",
  );
  assert.match(workflow, /rossjrw\/pr-preview-action@v1\.8\.1/);
  assert.match(workflow, /PREVIEW_BASE_PATH:\s*\/pr-preview\/pr-/);
  assert.match(
    workflow,
    /pages-base-url:\s*https:\/\/leasemate\.singletonsd\.com/,
  );
  assert.match(workflow, /pull-requests:\s*write/);
  assert.match(workflow, /leasemate-preview:start/);
  assert.match(workflow, /sticky-pull-request-comment@v2/);
  assert.match(workflow, /header:\s*leasemate-preview/);
  assert.match(workflow, /pnpm test:visual/);
  assert.match(workflow, /name:\s*visual-review/);
  assert.match(workflow, /visual-gate\.mjs/);
  assert.match(workflow, /visual-accepted/);
  assert.match(workflow, /VISUAL_SKIP_BASE/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /resolve-postkit-api-base-url/);
});

test("visual screenshot helper is wired for hosted report and gate", async () => {
  const pkg = await readFile(new URL("package.json", root), "utf8");
  const visual = await readFile(new URL("tests/visual.mjs", root), "utf8");
  const gate = await readFile(new URL("tests/visual-gate.mjs", root), "utf8");
  const template = await readFile(
    new URL(".github/pull_request_template.md", root),
    "utf8",
  );
  const deployment = await readFile(
    new URL("docs/deployment.md", root),
    "utf8",
  );
  assert.match(pkg, /"test:visual":\s*"node tests\/visual\.mjs"/);
  assert.match(pkg, /"test:visual:gate":\s*"node tests\/visual-gate\.mjs"/);
  assert.match(visual, /leasemate\.singletonsd\.com/);
  assert.doesNotMatch(visual, /role=advertiser|role=venue/);
  assert.match(visual, /mobile-375/);
  assert.match(visual, /stateCaptures/);
  assert.match(visual, /PUBLIC_LEAD_INTAKE_ENABLED:\s*"true"/);
  assert.match(visual, /ensureWaitlistDist/);
  assert.match(gate, /VISUAL_ACCEPTED/);
  assert.match(template, /leasemate-preview:start/);
  assert.match(template, /visual-accepted/);
  assert.match(deployment, /visual-review/);
});

test("Pages branch includes the production custom domain", async () => {
  const cname = await readFile(new URL("public/CNAME", root), "utf8");
  assert.equal(cname.trim(), "leasemate.singletonsd.com");
});

test("Route 53 documentation names the expected CNAME target", async () => {
  const deployment = await readFile(
    new URL("docs/deployment.md", root),
    "utf8",
  );
  assert.match(deployment, /leasemate\.singletonsd\.com/);
  assert.match(deployment, /singleton-sd\.github\.io/);
});

test("PostKit leftovers are not present", async () => {
  const pkg = await readFile(new URL("package.json", root), "utf8");
  assert.doesNotMatch(pkg, /post-kit/);
  assert.doesNotMatch(pkg, /resolve-postkit/);
});
