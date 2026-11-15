import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("generated Decap config matches the committed file", async () => {
  const configPath = new URL("public/admin/config.yml", root);
  const committed = await readFile(configPath, "utf8");

  execFileSync(
    process.execPath,
    ["--experimental-strip-types", "scripts/generate-cms-config.ts"],
    { cwd: fileURLToPath(root), stdio: "pipe" },
  );
  execFileSync(
    "pnpm",
    ["exec", "prettier", "--write", "public/admin/config.yml"],
    {
      cwd: fileURLToPath(root),
      stdio: "pipe",
    },
  );

  const generated = await readFile(configPath, "utf8");
  assert.equal(generated, committed);
});

test("Decap CMS admin script is version-pinned with SRI", async () => {
  const html = await readFile(new URL("public/admin/index.html", root), "utf8");
  assert.match(html, /unpkg\.com\/decap-cms@3\.15\.1\/dist\/decap-cms\.js/);
  assert.match(
    html,
    /integrity="sha384-in6eHztHveqQ7uMZ1fDaKlDmacQLFuLH2wWrFTiymyuS8zQ5bixwL8U3AeRi8h\/L"/,
  );
  assert.match(html, /crossorigin="anonymous"/);
});

test("Decap pages collection is generated per page file", async () => {
  const config = await readFile(
    new URL("public/admin/config.yml", root),
    "utf8",
  );

  assert.match(config, /name: pages/);
  assert.match(config, /repo: singleton-sd\/leasemate-marketing/);
  assert.match(config, /file: src\/content\/pages\/home\.md/);
  assert.match(config, /file: src\/content\/pages\/contact\.md/);
  assert.match(config, /name: template/);
  assert.match(config, /widget: hidden/);
  assert.doesNotMatch(config, /poc-inkads-marketing/);
  assert.doesNotMatch(config, /hello@/);
  assert.doesNotMatch(config, /mailto:/);
});
