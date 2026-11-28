import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const scriptPath = fileURLToPath(
  new URL("scripts/apply-appconfig-public-kv.mjs", root),
);

const { applyAppConfigPublicKv, githubEnvBlock } = await import(
  new URL("scripts/apply-appconfig-public-kv.mjs", root).href
);

test("unlabeled values apply first and the repo label wins", () => {
  const { applied, audit } = applyAppConfigPublicKv([
    {
      key: "PUBLIC_CHATWOOT_BASE_URL",
      label: "leasemate-marketing",
      value: "https://support.singletonsd.com",
      etag: "labeled-etag",
      lastModified: "2026-11-28",
    },
    {
      key: "PUBLIC_CHATWOOT_BASE_URL",
      label: null,
      value: "https://example.invalid",
      etag: "unlabeled-etag",
      lastModified: "2026-11-01",
    },
    {
      key: "PUBLIC_LEAD_INTAKE_ENABLED",
      value: "false",
    },
  ]);
  assert.deepEqual(
    Object.fromEntries(applied.map(({ key, value }) => [key, value])),
    {
      PUBLIC_CHATWOOT_BASE_URL: "https://support.singletonsd.com",
      PUBLIC_LEAD_INTAKE_ENABLED: "false",
    },
  );
  assert.equal(audit.length, 3);
});

test("Key Vault references fail without echoing the value", () => {
  assert.throws(
    () =>
      applyAppConfigPublicKv([
        {
          key: "PUBLIC_TURNSTILE_SITE_KEY",
          contentType: "application/vnd.microsoft.appconfig.keyvaultref+json",
          value: "secret-should-not-appear",
        },
      ]),
    (err) => {
      assert.match(String(err), /Key Vault reference/);
      assert.doesNotMatch(String(err), /secret-should-not-appear/);
      return true;
    },
  );
});

test("non-PUBLIC keys fail the job", () => {
  assert.throws(
    () => applyAppConfigPublicKv([{ key: "SECRET_THING", value: "nope" }]),
    /not PUBLIC_\*/,
  );
});

test("CLI writes GITHUB_ENV and the job summary audit trail", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "appconfig-"));
  const envFile = path.join(dir, "env");
  const summaryFile = path.join(dir, "summary");
  await writeFile(envFile, "");
  await writeFile(summaryFile, "");
  const payload = JSON.stringify([
    {
      key: "PUBLIC_CHATWOOT_WEBSITE_TOKEN",
      label: "leasemate-marketing",
      value: "inbox-token",
      etag: "etag-1",
      lastModified: "2026-11-28T00:00:00Z",
    },
  ]);
  const result = spawnSync(process.execPath, [scriptPath], {
    input: payload,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_ENV: envFile,
      GITHUB_STEP_SUMMARY: summaryFile,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  const env = await readFile(envFile, "utf8");
  const summary = await readFile(summaryFile, "utf8");
  assert.equal(
    env,
    githubEnvBlock("PUBLIC_CHATWOOT_WEBSITE_TOKEN", "inbox-token"),
  );
  assert.match(summary, /PUBLIC_CHATWOOT_WEBSITE_TOKEN/);
  assert.match(summary, /leasemate-marketing/);
  assert.match(summary, /inbox-token/);
  assert.match(result.stdout, /appconfig key=PUBLIC_CHATWOOT_WEBSITE_TOKEN/);
});
