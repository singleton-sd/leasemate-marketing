import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

test("design tokens match LeaseMate dark-first branding", async () => {
  const pkg = await readFile(new URL("package.json", root), "utf8");
  const styles = await readFile(new URL("src/styles/global.css", root), "utf8");
  assert.match(pkg, /"@singleton-sd\/tokens":\s*"1\.8\.0"/);
  assert.match(styles, /@import "@singleton-sd\/tokens\/css\/root\/dark"/);
  assert.match(styles, /--lm-canvas:\s*var\(--ssd-color-background-default\)/);
  assert.match(styles, /--lm-surface:\s*var\(--ssd-color-background-muted\)/);
  assert.match(styles, /--lm-text:\s*var\(--ssd-color-text-default\)/);
  assert.match(styles, /--lm-text-muted:\s*var\(--ssd-color-text-muted\)/);
  assert.match(styles, /--lm-border:\s*var\(--ssd-color-border-default\)/);
  assert.match(styles, /--lm-focus:\s*var\(--ssd-color-border-focus\)/);
  assert.match(
    styles,
    /--lm-accent-pressed:\s*var\(--ssd-color-background-brand-pressed\)/,
  );
  assert.match(styles, /--lm-on-accent:\s*var\(--ssd-color-black\)/);
  assert.match(styles, /color-scheme:\s*dark/);
  assert.doesNotMatch(styles, /--ssd-color-gray-900:\s*#111111/);
  assert.doesNotMatch(styles, /outline:\s*none/);
  assert.doesNotMatch(styles, /font-weight:\s*300/);
});

test("approved font is self-hosted Plus Jakarta Sans", async () => {
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  const styles = await readFile(new URL("src/styles/global.css", root), "utf8");
  assert.match(layout, /@fontsource-variable\/plus-jakarta-sans/);
  assert.match(layout, /data-theme="dark"/);
  assert.match(styles, /--lm-font:.*"Plus Jakarta Sans"/);
});

test("shell includes skip navigation", async () => {
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  assert.match(layout, /Skip to content/);
});

test("JSON-LD escapes < to prevent script breakout", async () => {
  const layout = await readFile(
    new URL("src/layouts/BaseLayout.astro", root),
    "utf8",
  );
  assert.match(
    layout,
    /JSON\.stringify\(jsonLd\)\.replaceAll\("<", "\\\\u003c"\)/,
  );
});

test("motion respects the user reduced-motion preference", async () => {
  const styles = await readFile(new URL("src/styles/global.css", root), "utf8");
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test("header and footer expose the LeaseMate IA", async () => {
  const header = await readFile(
    new URL("src/components/SiteHeader.astro", root),
    "utf8",
  );
  const footer = await readFile(
    new URL("src/components/SiteFooter.astro", root),
    "utf8",
  );
  const { isActivePath, primaryNav, footerNav } = await import(
    pathToFileURL(new URL("src/lib/nav.ts", root).pathname).href
  );

  assert.match(header, /Join waitlist/);
  assert.match(header, /aria-current=\{/);
  assert.match(footer, /aria-label="Footer"/);
  assert.match(footer, /site-footer__heading/);
  assert.match(footer, /house owners and lease holders in Victoria/);
  assert.match(footer, /© 2026 LeaseMate/);

  assert.deepEqual(
    primaryNav.map((item) => item.href),
    ["/features", "/pricing"],
  );
  assert.ok(footerNav.Company.some((item) => item.href === "/contact"));
  assert.equal(isActivePath("/features", "/features", "/"), true);
  assert.equal(isActivePath("/", "/", "/"), true);
  assert.equal(isActivePath("/features", "/", "/"), false);
});
