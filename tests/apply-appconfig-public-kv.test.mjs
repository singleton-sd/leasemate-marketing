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

function parseGithubEnv(text) {
  const assignments = {};
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === "") {
      i += 1;
      continue;
    }
    const heredoc = /^([A-Za-z_][A-Za-z0-9_]*)<<(.*)$/.exec(line);
    if (heredoc) {
      const [, key, delimiter] = heredoc;
      i += 1;
      const body = [];
      while (i < lines.length && lines[i] !== delimiter) {
        body.push(lines[i]);
        i += 1;
      }
      assert.notEqual(
        i,
        lines.length,
        `unclosed GITHUB_ENV delimiter ${delimiter}`,
      );
      assignments[key] = body.join("\n");
      i += 1;
      continue;
    }
    const simple = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    assert.ok(simple, `unparsed GITHUB_ENV line ${JSON.stringify(line)}`);
    assignments[simple[1]] = simple[2];
    i += 1;
  }
  return assignments;
}

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
    (err) => {
      assert.match(String(err), /not PUBLIC_\*/);
      assert.doesNotMatch(String(err), /nope/);
      return true;
    },
  );
});

test("keys containing newlines fail without echoing the value", () => {
  const injected = "PUBLIC_A=ok\nPATH=/tmp\nPUBLIC_B";
  assert.throws(
    () =>
      applyAppConfigPublicKv([
        { key: injected, value: "secret-should-not-appear" },
      ]),
    (err) => {
      assert.match(String(err), /not PUBLIC_\*/);
      assert.doesNotMatch(String(err), /secret-should-not-appear/);
      return true;
    },
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
  const envMatch =
    /^PUBLIC_CHATWOOT_WEBSITE_TOKEN<<(APPCONFIG_[0-9a-f]+)\ninbox-token\n\1\n$/.exec(
      env,
    );
  assert.ok(envMatch, `unexpected GITHUB_ENV block: ${JSON.stringify(env)}`);
  assert.match(summary, /PUBLIC_CHATWOOT_WEBSITE_TOKEN/);
  assert.match(summary, /leasemate-marketing/);
  assert.match(summary, /inbox-token/);
  assert.match(result.stdout, /appconfig key=PUBLIC_CHATWOOT_WEBSITE_TOKEN/);
});

test("values containing APPCONFIG_EOF cannot inject extra GITHUB_ENV assignments", () => {
  const value =
    "safe\nAPPCONFIG_EOF\nPATH=/tmp\nPUBLIC_PAD<<APPCONFIG_EOF\npad";
  const block = githubEnvBlock("PUBLIC_NOTE", value);
  const parsed = parseGithubEnv(block);
  assert.deepEqual(Object.keys(parsed), ["PUBLIC_NOTE"]);
  assert.equal(parsed.PUBLIC_NOTE, value);
  assert.doesNotMatch(block.split("\n")[0] ?? "", /APPCONFIG_EOF$/);
});

test("githubEnvBlock regenerates when the delimiter appears in the value", () => {
  const colliding = "APPCONFIG_deadbeefdeadbeefdeadbeefdeadbeef";
  const next = "APPCONFIG_cafebabecafebabecafebabecafebabe";
  let calls = 0;
  const createDelimiter = () => {
    calls += 1;
    return calls === 1 ? colliding : next;
  };
  const value = `hello\n${colliding}\nworld`;
  const block = githubEnvBlock("PUBLIC_NOTE", value, createDelimiter);
  assert.equal(block, `PUBLIC_NOTE<<${next}\n${value}\n${next}\n`);
  assert.equal(calls, 2);
  assert.deepEqual(parseGithubEnv(block), { PUBLIC_NOTE: value });
});

test("githubEnvBlock fails closed when no delimiter is absent from the value", () => {
  const delimiter = "APPCONFIG_always";
  const value = `secret-should-not-appear\n${delimiter}`;
  assert.throws(
    () => githubEnvBlock("PUBLIC_NOTE", value, () => delimiter),
    (err) => {
      assert.match(String(err), /delimiter/);
      assert.doesNotMatch(String(err), /secret-should-not-appear/);
      return true;
    },
  );
});

test("multiline values stay inside a single GITHUB_ENV assignment", () => {
  const value = "line-one\nline-two";
  const block = githubEnvBlock("PUBLIC_NOTE", value);
  const parsed = parseGithubEnv(block);
  assert.deepEqual(Object.keys(parsed), ["PUBLIC_NOTE"]);
  assert.equal(parsed.PUBLIC_NOTE, value);
});

test("CLI fails when az produces no JSON", () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    input: "",
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /produced no JSON/);
});
