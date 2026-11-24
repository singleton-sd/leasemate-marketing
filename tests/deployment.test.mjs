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
  assert.match(workflow, /^permissions:\n {2}contents: read\n/m);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /pnpm\/action-setup@[0-9a-f]{40} # v6\.1\.1/);
  assert.match(
    workflow,
    /actions\/create-github-app-token@[0-9a-f]{40} # v3\.3\.0/,
  );
  assert.match(workflow, /app-id:\s*\$\{\{\s*vars\.RELEASE_APP_ID\s*\}\}/);
  assert.match(
    workflow,
    /private-key:\s*\$\{\{\s*secrets\.RELEASE_APP_PRIVATE_KEY\s*\}\}/,
  );
  assert.match(workflow, /repositories:\s*leasemate-marketing/);
  assert.match(
    workflow,
    /token:\s*\$\{\{\s*steps\.app-token\.outputs\.token\s*\}\}/,
  );
  assert.match(
    workflow,
    /JamesIves\/github-pages-deploy-action@[0-9a-f]{40} # v4\.8\.0/,
  );
  assert.match(workflow, /branch:\s*gh-pages/);
  assert.match(workflow, /clean-exclude:\s*pr-preview/);
  assert.doesNotMatch(workflow, /secrets\.(?!RELEASE_APP_PRIVATE_KEY)/);
  assert.doesNotMatch(workflow, /secrets\.GITHUB_TOKEN/);
  assert.doesNotMatch(workflow, /token:\s*\$\{\{\s*github\.token\s*\}\}/);
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
  assert.match(workflow, /^permissions:\n {2}contents: read\n/m);
  assert.match(workflow, /persist-credentials:\s*false/);
  assert.match(workflow, /pnpm\/action-setup@[0-9a-f]{40} # v6\.1\.1/);
  assert.match(workflow, /rossjrw\/pr-preview-action@[0-9a-f]{40} # v1\.8\.1/);
  assert.match(
    workflow,
    /actions\/create-github-app-token@[0-9a-f]{40} # v3\.3\.0/,
  );
  assert.match(
    workflow,
    /token:\s*\$\{\{\s*steps\.app-token\.outputs\.token\s*\}\}/,
  );
  assert.match(workflow, /PREVIEW_BASE_PATH:\s*\/pr-preview\/pr-/);
  assert.match(
    workflow,
    /pages-base-url:\s*https:\/\/leasemate\.singletonsd\.com/,
  );
  assert.match(workflow, /pull-requests:\s*write/);
  assert.match(workflow, /leasemate-preview:start/);
  assert.match(workflow, /sticky-pull-request-comment@[0-9a-f]{40} # v2\.9\.4/);
  assert.match(workflow, /PR_NUMBER:\s*\$\{\{\s*github\.event\.number\s*\}\}/);
  assert.match(workflow, /GH_REPOSITORY:\s*\$\{\{\s*github\.repository\s*\}\}/);
  assert.match(workflow, /ARTIFACT="visual-pr-\$\{PR_NUMBER\}"/);
  assert.match(workflow, /header:\s*leasemate-preview/);
  assert.match(workflow, /pnpm test:visual/);
  assert.match(workflow, /pnpm test:seo/);
  assert.match(workflow, /SEO metadata checks with lead intake on/);
  assert.match(workflow, /name:\s*visual-review/);
  assert.match(workflow, /visual-gate\.mjs/);
  assert.match(workflow, /visual-accepted/);
  assert.match(workflow, /VISUAL_SKIP_BASE/);
  assert.match(workflow, /VISUAL_HEAD_SHA/);
  assert.match(workflow, /ARTIFACT_HEAD_SHA/);
  assert.match(workflow, /\.headSha/);
  assert.doesNotMatch(workflow, /pull_request_target/);
  assert.doesNotMatch(workflow, /secrets\.(?!RELEASE_APP_PRIVATE_KEY)/);
  assert.doesNotMatch(workflow, /secrets\.GITHUB_TOKEN/);
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
  assert.match(visual, /VISUAL_HEAD_SHA/);
  assert.match(gate, /VISUAL_ACCEPTED/);
  assert.match(gate, /manifest\.headSha/);
  assert.match(template, /leasemate-preview:start/);
  assert.match(template, /visual-accepted/);
  assert.match(deployment, /visual-review/);
});

function workflowJobs(yaml) {
  const jobsSection = yaml
    .split(/^jobs:\n/m)
    .slice(1)
    .join("jobs:\n");
  const jobs = [];
  let current = null;
  for (const line of jobsSection.split("\n")) {
    const header = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (header) {
      if (current) jobs.push(current);
      current = { name: header[1], body: "" };
      continue;
    }
    if (current) current.body += `${line}\n`;
  }
  if (current) jobs.push(current);
  return jobs;
}

test("Pages push jobs check out a git workspace before JamesIves or pr-preview", async () => {
  const pages = await readFile(
    new URL(".github/workflows/pages.yml", root),
    "utf8",
  );
  const preview = await readFile(
    new URL(".github/workflows/preview.yml", root),
    "utf8",
  );
  const pushJobs = [...workflowJobs(pages), ...workflowJobs(preview)].filter(
    (job) =>
      /JamesIves\/github-pages-deploy-action/.test(job.body) ||
      /rossjrw\/pr-preview-action/.test(job.body),
  );
  assert.ok(
    pushJobs.length >= 3,
    "expected deploy, deploy-preview, and cleanup-preview push jobs",
  );
  for (const job of pushJobs) {
    assert.match(
      job.body,
      /steps:\n {6}- name: [^\n]+\n {8}uses: actions\/checkout@[0-9a-f]{40} # v7(?:\.\d+\.\d+)?\n {8}with:\n {10}persist-credentials:\s*false\n/,
      `${job.name} must check out with persist-credentials: false before the Pages push action`,
    );
  }
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
