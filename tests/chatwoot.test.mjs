import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

const { CHATWOOT_LOAD_TIMEOUT_MS, chatwootSdkSrc, getChatwootConfig } =
  await import(
    pathToFileURL(new URL("src/lib/chatwoot.ts", root).pathname).href
  );

test("chatwoot config is off when token or base URL is missing", () => {
  assert.equal(getChatwootConfig(), null);
  assert.equal(getChatwootConfig("", "https://support.singletonsd.com"), null);
  assert.equal(getChatwootConfig("token", ""), null);
  assert.equal(
    getChatwootConfig("  ", "https://support.singletonsd.com"),
    null,
  );
  assert.equal(getChatwootConfig("token", "   "), null);
});

test("chatwoot config requires https and returns the origin", () => {
  assert.equal(
    getChatwootConfig("token", "http://support.singletonsd.com"),
    null,
  );
  assert.equal(getChatwootConfig("token", "not a url"), null);
  assert.deepEqual(
    getChatwootConfig(
      "  inbox-token  ",
      "https://support.singletonsd.com/app/",
    ),
    {
      websiteToken: "inbox-token",
      baseUrl: "https://support.singletonsd.com",
    },
  );
  assert.equal(
    chatwootSdkSrc("https://support.singletonsd.com"),
    "https://support.singletonsd.com/packs/js/sdk.js",
  );
});

test("site-wide loader uses the async Chatwoot snippet with a timeout", async () => {
  const widget = await readFile(
    new URL("src/components/ChatwootWidget.astro", root),
    "utf8",
  );
  const loader = await readFile(new URL("src/lib/chatwoot.ts", root), "utf8");
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  const envExample = await readFile(new URL(".env.example", root), "utf8");
  const envTypes = await readFile(new URL("src/env.d.ts", root), "utf8");

  assert.match(layout, /ChatwootWidget/);
  assert.match(widget, /getChatwootConfig/);
  assert.match(widget, /PUBLIC_CHATWOOT_WEBSITE_TOKEN/);
  assert.match(widget, /PUBLIC_CHATWOOT_BASE_URL/);
  assert.match(widget, /data-chatwoot-loader/);
  assert.match(widget, /bootChatwootFromDom/);
  assert.match(widget, /await import\("\.\.\/lib\/chatwoot"\)/);
  assert.match(widget, /window\.chatwootSettings = \{ darkMode: "dark" \}/);
  assert.match(loader, /applyChatwootSettings/);
  assert.match(loader, /darkMode: "dark"/);
  assert.doesNotMatch(widget, /position:|type:/);
  assert.doesNotMatch(loader, /position:|type:|#ffb300/i);
  assert.ok(
    widget.indexOf('window.chatwootSettings = { darkMode: "dark" }') <
      widget.indexOf('await import("../lib/chatwoot")'),
    "chatwootSettings must be set before the SDK module loads",
  );
  assert.ok(
    loader.indexOf("applyChatwootSettings()") <
      loader.indexOf("d.createElement(t)"),
    "chatwootSettings must be set before the SDK script is created",
  );
  assert.match(loader, /g\.async = true/);
  assert.match(loader, /chatwootSDK\?\.run/);
  assert.match(loader, /websiteToken,/);
  assert.match(loader, /baseUrl: BASE_URL/);
  assert.match(loader, /addEventListener\("error", fail/);
  assert.equal(CHATWOOT_LOAD_TIMEOUT_MS, 8_000);
  assert.match(loader, /CHATWOOT_LOAD_TIMEOUT_MS = 8_000/);
  assert.match(widget, /CHATWOOT_LOAD_TIMEOUT_MS/);
  assert.doesNotMatch(loader, /setUser|identifier_hash|hmac/i);
  assert.doesNotMatch(loader, /searchParams|location\.search|URLSearchParams/);
  assert.match(envExample, /PUBLIC_CHATWOOT_WEBSITE_TOKEN=/);
  assert.match(envExample, /PUBLIC_CHATWOOT_BASE_URL=/);
  assert.match(envTypes, /PUBLIC_CHATWOOT_WEBSITE_TOKEN/);
  assert.match(envTypes, /PUBLIC_CHATWOOT_BASE_URL/);
});

test("chatwoot website token is not hardcoded in source", async () => {
  const files = [
    "src/components/ChatwootWidget.astro",
    "src/lib/chatwoot.ts",
    "src/layouts/BaseLayout.astro",
    ".env.example",
    ".github/workflows/pages.yml",
    ".github/workflows/preview.yml",
    "docs/deployment.md",
    "README.md",
  ];
  for (const relative of files) {
    const source = await readFile(new URL(relative, root), "utf8");
    assert.doesNotMatch(
      source,
      /gaYML9LPSEo5KEd9MiTjLUqy/,
      `${relative} must not hardcode the website token`,
    );
  }
});
