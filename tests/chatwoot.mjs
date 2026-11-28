/* eslint-disable no-undef */
/**
 * Playwright: Chatwoot loader present when PUBLIC_CHATWOOT_* is set, and the
 * page still works when the SDK origin is blocked.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import http from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const { getChatwootConfig } = await import(
  new URL("../src/lib/chatwoot.ts", import.meta.url).href
);

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const defaultDistDir = path.join(rootDir, "dist");
const TEST_TOKEN = "test-chatwoot-website-token";
const TEST_BASE_URL = "https://support.singletonsd.com";
const SDK_STUB = `
window.chatwootSDK = {
  run: function (options) {
    window.__CHATWOOT_RUN__ = options;
  }
};
`;

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

      if (!existsSync(fsPath) || statSync(fsPath).isDirectory()) {
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

function ensureChatwootDist() {
  const out = path.join(rootDir, "test-results", "dist-chatwoot-on");
  mkdirSync(path.dirname(out), { recursive: true });
  const result = spawnSync(
    "pnpm",
    ["exec", "astro", "build", "--outDir", out],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        PUBLIC_CHATWOOT_WEBSITE_TOKEN: TEST_TOKEN,
        PUBLIC_CHATWOOT_BASE_URL: TEST_BASE_URL,
      },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    throw new Error("Failed to build chatwoot-on dist.");
  }
  return out;
}

function isChatwootEnvOn() {
  return Boolean(
    getChatwootConfig(
      process.env.PUBLIC_CHATWOOT_WEBSITE_TOKEN,
      process.env.PUBLIC_CHATWOOT_BASE_URL,
    ),
  );
}

if (!existsSync(defaultDistDir)) {
  throw new Error(
    `Missing dist directory at ${defaultDistDir}. Run pnpm build first.`,
  );
}

const chatwootOnDist = ensureChatwootDist();
const chatwootServer = createStaticServer(chatwootOnDist);
const chatwootPort = await listen(chatwootServer);
const origin = `http://127.0.0.1:${chatwootPort}`;

const browser = await chromium.launch();

try {
  const defaultIndex = await readFile(
    path.join(defaultDistDir, "index.html"),
    "utf8",
  );
  if (isChatwootEnvOn()) {
    assert.match(defaultIndex, /data-chatwoot-loader/);
  } else {
    assert.doesNotMatch(defaultIndex, /data-chatwoot-loader/);
    assert.doesNotMatch(defaultIndex, /data-chatwoot-website-token=/);
  }

  const onIndex = await readFile(
    path.join(chatwootOnDist, "index.html"),
    "utf8",
  );
  assert.match(onIndex, /data-chatwoot-loader/);
  assert.match(onIndex, new RegExp(TEST_TOKEN));
  assert.match(onIndex, /https:\/\/support\.singletonsd\.com/);
  assert.doesNotMatch(onIndex, /[?&](email|name)=/i);

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    await page.route("https://support.singletonsd.com/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/packs/js/sdk.js")) {
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: SDK_STUB,
        });
        return;
      }
      await route.abort();
    });
    await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__CHATWOOT_RUN__), null, {
      timeout: 5_000,
    });
    const ran = await page.evaluate(() => window.__CHATWOOT_RUN__);
    assert.deepEqual(ran, {
      websiteToken: TEST_TOKEN,
      baseUrl: TEST_BASE_URL,
    });
    assert.deepEqual(await page.evaluate(() => window.chatwootSettings), {
      darkMode: "dark",
    });
    await page.locator("#main-content").waitFor();
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error)));
    await page.route("https://support.singletonsd.com/**", (route) =>
      route.abort("failed"),
    );
    await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
    await page.locator("#main-content").waitFor();
    await page.locator("text=LeaseMate").first().waitFor();
    await page.waitForTimeout(500);
    assert.equal(await page.locator("#main-content").count(), 1);
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    await context.close();
  }

  console.log("chatwoot: ok");
} finally {
  await browser.close();
  await new Promise((resolve) => chatwootServer.close(resolve));
}
