/* eslint-disable no-undef */
/**
 * Playwright: Umami tracker is injected on every built page when
 * PUBLIC_UMAMI_WEBSITE_ID is set, and is absent (with no errors) when empty.
 * analytics.singletonsd.com is stubbed so the harness stays offline.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import http from "node:http";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import {
  TEST_UMAMI_WEBSITE_ID,
  UMAMI_DOMAINS,
  UMAMI_SCRIPT_SRC,
} from "./umami-fixtures.mjs";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const defaultDistDir = path.join(rootDir, "dist");
const ATTRIBUTION_KEY = "ssd:attribution";
const ATTRIBUTION_FIXTURE = JSON.stringify({
  v: 1,
  utmSource: "keep",
});
const SCRIPT_STUB = "window.umami={track:function(){}};";

function contentTypeForPath(pathname) {
  if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".ico")) return "image/x-icon";
  if (pathname.endsWith(".xml")) return "application/xml; charset=utf-8";
  if (pathname.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (pathname.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

function normalizePathname(urlPath) {
  const cleaned = urlPath.replace(/\?.*$/, "").replace(/\/+$/, "");
  if (cleaned === "") return "/index.html";
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
}

function resolveFsPath(root, urlPath) {
  const pathname = normalizePathname(urlPath);
  let fsPath = `${root}${pathname}`;
  if (existsSync(fsPath) && statSync(fsPath).isDirectory()) {
    fsPath = `${fsPath.replace(/\/$/, "")}/index.html`;
  }
  return {
    pathname: fsPath.startsWith(root) ? fsPath.slice(root.length) : pathname,
    fsPath,
  };
}

function createStaticServer(root) {
  return http.createServer(async (req, res) => {
    try {
      if (!req.url) {
        res.statusCode = 400;
        res.end("Bad request");
        return;
      }

      const { pathname, fsPath } = resolveFsPath(root, req.url);
      const notFoundPath = path.join(root, "404.html");

      if (!existsSync(fsPath) || statSync(fsPath).isDirectory()) {
        if (existsSync(notFoundPath)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(await readFile(notFoundPath));
          return;
        }
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      res.setHeader("Content-Type", contentTypeForPath(pathname));

      if (
        pathname.endsWith(".html") ||
        pathname.endsWith(".css") ||
        pathname.endsWith(".js") ||
        pathname.endsWith(".xml") ||
        pathname.endsWith(".txt")
      ) {
        res.end(await readFile(fsPath, "utf8"));
        return;
      }

      createReadStream(fsPath).pipe(res);
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });
}

function isExpected404Console(text) {
  return (
    text.includes("Failed to load resource") && text.includes("404 (Not Found)")
  );
}

function listen(server, preferredPort = 0) {
  return new Promise((resolve) => {
    server.listen(preferredPort, "127.0.0.1", () => {
      const address = server.address();
      assert.ok(
        address && typeof address === "object" && address.port > 0,
        "Failed to pick an available port",
      );
      resolve(address.port);
    });
  });
}

function collectHtmlRoutes(dir, prefix = "") {
  const entries = readdirSync(dir, { withFileTypes: true });
  const routes = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "admin" || entry.name === "visual") continue;
      routes.push(...collectHtmlRoutes(full, `${prefix}${entry.name}/`));
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    if (entry.name === "404.html") {
      routes.push("/missing-page-for-404");
      continue;
    }
    if (entry.name === "index.html") {
      routes.push(prefix.length === 0 ? "/" : `/${prefix}`);
      continue;
    }
    const slug = entry.name.replace(/\.html$/, "");
    routes.push(`/${prefix}${slug}/`);
  }
  return routes;
}

function parseSitemapRoutes(xml) {
  const routes = [];
  const pattern = /<loc>https:\/\/leasemate\.singletonsd\.com(\/[^<]*)<\/loc>/g;
  let match;
  while ((match = pattern.exec(xml)) !== null) {
    routes.push(match[1] === "" ? "/" : match[1]);
  }
  return routes;
}

function buildUmamiDist(label, websiteId) {
  const out = path.join(rootDir, "test-results", `dist-umami-${label}`);
  mkdirSync(path.dirname(out), { recursive: true });
  const env = {
    ...process.env,
    PUBLIC_UMAMI_WEBSITE_ID: websiteId,
  };
  const result = spawnSync(
    "pnpm",
    ["exec", "astro", "build", "--outDir", out],
    {
      cwd: rootDir,
      env,
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    throw new Error(`Failed to build umami-${label} dist.`);
  }
  return out;
}

async function stubAnalyticsHost(page) {
  await page.route("https://analytics.singletonsd.com/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/script.js")) {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: SCRIPT_STUB,
      });
      return;
    }
    await route.abort();
  });
}

async function assertTrackerPresent(page, origin, urlPath) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (!isExpected404Console(text)) consoleErrors.push(text);
  });
  await stubAnalyticsHost(page);
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: ATTRIBUTION_KEY, value: ATTRIBUTION_FIXTURE },
  );
  await page.goto(`${origin}${urlPath}`, { waitUntil: "domcontentloaded" });
  await page.locator("#main-content").waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll("script[data-website-id]").length === 1,
    null,
    { timeout: 5_000 },
  );
  const tags = await page
    .locator("script[data-website-id]")
    .evaluateAll((scripts) =>
      scripts.map((script) => ({
        src: script.getAttribute("src"),
        websiteId: script.getAttribute("data-website-id"),
        domains: script.getAttribute("data-domains"),
        defer: script.defer,
      })),
    );
  assert.equal(
    tags.length,
    1,
    `${urlPath} expected exactly one Umami script, got ${tags.length}`,
  );
  assert.equal(tags[0]?.src, UMAMI_SCRIPT_SRC, `${urlPath} src`);
  assert.equal(tags[0]?.websiteId, TEST_UMAMI_WEBSITE_ID, `${urlPath} id`);
  assert.equal(tags[0]?.domains, UMAMI_DOMAINS, `${urlPath} domains`);
  assert.equal(tags[0]?.defer, true, `${urlPath} defer`);
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    ATTRIBUTION_KEY,
  );
  assert.equal(
    stored,
    ATTRIBUTION_FIXTURE,
    `${urlPath} must not rewrite first-touch attribution`,
  );
  assert.equal(
    pageErrors.length,
    0,
    `${urlPath} pageerror: ${pageErrors.join("\n")}`,
  );
  assert.equal(
    consoleErrors.length,
    0,
    `${urlPath} console error: ${consoleErrors.join("\n")}`,
  );
}

async function assertTrackerAbsent(page, origin, urlPath) {
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (!isExpected404Console(text)) consoleErrors.push(text);
  });
  await stubAnalyticsHost(page);
  await page.goto(`${origin}${urlPath}`, { waitUntil: "domcontentloaded" });
  await page.locator("#main-content").waitFor();
  await page.waitForTimeout(500);
  const count = await page.locator("script[data-website-id]").count();
  assert.equal(count, 0, `${urlPath} expected no Umami script`);
  assert.equal(
    await page.locator(`script[src="${UMAMI_SCRIPT_SRC}"]`).count(),
    0,
    `${urlPath} expected no Umami src`,
  );
  assert.equal(
    pageErrors.length,
    0,
    `${urlPath} pageerror: ${pageErrors.join("\n")}`,
  );
  assert.equal(
    consoleErrors.length,
    0,
    `${urlPath} console error: ${consoleErrors.join("\n")}`,
  );
}

if (!existsSync(defaultDistDir)) {
  throw new Error(
    `Missing dist directory at ${defaultDistDir}. Run pnpm build first.`,
  );
}

const umamiOnDist = buildUmamiDist("on", TEST_UMAMI_WEBSITE_ID);
const umamiOffDist = buildUmamiDist("off", "");

const sitemapXml = await readFile(
  path.join(umamiOnDist, "sitemap.xml"),
  "utf8",
);
const sitemapRoutes = parseSitemapRoutes(sitemapXml);
const builtRoutes = collectHtmlRoutes(umamiOnDist);
const requiredRoutes = ["/waitlist/", "/privacy/", "/waitlist-privacy/"];
const onRoutes = [
  ...new Set([...sitemapRoutes, ...builtRoutes, ...requiredRoutes]),
];
assert.ok(
  onRoutes.includes("/waitlist/"),
  "waitlist must be in the built page list",
);
assert.ok(
  onRoutes.includes("/privacy/"),
  "privacy (waitlist privacy policy) must be in the built page list",
);

const onServer = createStaticServer(umamiOnDist);
const offServer = createStaticServer(umamiOffDist);
const onPort = await listen(onServer);
const offPort = await listen(offServer);
const onOrigin = `http://127.0.0.1:${onPort}`;
const offOrigin = `http://127.0.0.1:${offPort}`;

const browser = await chromium.launch();

try {
  {
    const context = await browser.newContext();
    for (const urlPath of onRoutes) {
      const page = await context.newPage();
      await assertTrackerPresent(page, onOrigin, urlPath);
      await page.close();
    }
    await context.close();
  }

  {
    const context = await browser.newContext();
    for (const urlPath of onRoutes) {
      const page = await context.newPage();
      await assertTrackerAbsent(page, offOrigin, urlPath);
      await page.close();
    }
    await context.close();
  }

  console.log(`umami: ok (${onRoutes.length} routes)`);
} finally {
  await browser.close();
  await new Promise((resolve) => onServer.close(resolve));
  await new Promise((resolve) => offServer.close(resolve));
}
