/* eslint-disable no-undef */
/**
 * Playwright: contact + waitlist POST /v1/leads (mocked).
 * Flag-off and flag-on dists are built here so CI can bake App Config into
 * workspace dist/ without breaking the opening-soon path.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import http from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.LEAD_FORMS_PORT ?? 0);
const TURNSTILE_LOAD_ERROR =
  "Verification failed to load. Check your connection and try again.";
const TURNSTILE_STUB_SCRIPT = `
window.turnstile = {
  render(container, options) {
    if (container instanceof HTMLElement) {
      container.dataset.turnstileReady = "true";
    }
    queueMicrotask(() => options?.callback?.("test-turnstile-token"));
    return "widget-retry";
  },
  reset() {},
  remove() {},
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

function ensureLeadFormsDist(enabled) {
  const out = path.join(
    rootDir,
    "test-results",
    enabled ? "dist-lead-forms-on" : "dist-lead-forms-off",
  );
  mkdirSync(path.dirname(out), { recursive: true });
  const result = spawnSync(
    "pnpm",
    ["exec", "astro", "build", "--outDir", out],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        PUBLIC_LEAD_INTAKE_ENABLED: enabled ? "true" : "false",
        PUBLIC_TURNSTILE_SITE_KEY:
          process.env.PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
      },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    throw new Error(
      enabled
        ? "Failed to build lead-forms-on dist."
        : "Failed to build lead-forms-off dist.",
    );
  }
  return out;
}

const leadOffDist = ensureLeadFormsDist(false);
const leadOnDist = ensureLeadFormsDist(true);
const leadOnServer = createStaticServer(leadOnDist);
const leadOnPort = await listen(leadOnServer, port);
const origin = `http://127.0.0.1:${leadOnPort}`;

const browser = await chromium.launch();
const context = await browser.newContext();
await context.route("https://support.singletonsd.com/**", (route) =>
  route.abort(),
);
await context.addInitScript(() => {
  let lastOptions;
  window.turnstile = {
    render(container, options) {
      lastOptions = options;
      if (container instanceof HTMLElement) {
        container.dataset.turnstileReady = "true";
      }
      queueMicrotask(() => options?.callback?.("test-turnstile-token"));
      return "widget-test";
    },
    reset() {
      queueMicrotask(() => lastOptions?.callback?.("test-turnstile-token"));
    },
    remove() {},
  };
});
const page = await context.newPage();

async function mockLeads(handler) {
  const posts = [];
  await page.route("https://api.singletonsd.com/v1/leads", async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    posts.push({
      url: request.url(),
      method: request.method(),
      contentType: request.headers()["content-type"],
      body,
    });
    const response = await handler(body);
    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.json),
    });
  });
  return posts;
}

try {
  {
    const flagOffServer = createStaticServer(leadOffDist);
    const flagOffPort = await listen(flagOffServer);
    const flagOffOrigin = `http://127.0.0.1:${flagOffPort}`;
    const flagOffPage = await context.newPage();
    try {
      await flagOffPage.goto(`${flagOffOrigin}/contact/`, {
        waitUntil: "networkidle",
      });
      await flagOffPage.waitForSelector("[data-contact-opening-soon]");
      assert.equal(await flagOffPage.locator("[data-contact-form]").count(), 0);
      await flagOffPage.goto(`${flagOffOrigin}/waitlist/`, {
        waitUntil: "networkidle",
      });
      await flagOffPage.waitForSelector("[data-waitlist-opening-soon]");
      assert.equal(
        await flagOffPage.locator("[data-waitlist-form]").count(),
        0,
      );
    } finally {
      await flagOffPage.close();
      flagOffServer.close();
    }
  }

  const successPosts = await mockLeads(async () => ({
    status: 202,
    json: { id: "550e8400-e29b-41d4-a716-446655440000" },
  }));

  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-lead-turnstile]");
  await page.locator("#contact-name").fill("Ada Lovelace");
  await page.locator("#contact-company").fill("Example House");
  await page.locator("#contact-email").fill("ada@example.com");
  await page.locator("#contact-phone").fill("+61 400 000 000");
  await page.locator("#contact-role").selectOption("House owner");
  await page
    .locator("#contact-message")
    .fill("Please follow up about a house lease.");
  await page.locator("#contact-consent").check();
  assert.equal(await page.locator("#contact-marketing").isChecked(), false);

  const submit = page.locator("[data-contact-form-submit]");
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await submit.click();
  await page.waitForSelector("[data-contact-form-success]:not([hidden])");

  assert.equal(successPosts.length, 1);
  assert.equal(successPosts[0].url, "https://api.singletonsd.com/v1/leads");
  assert.equal(successPosts[0].method, "POST");
  assert.match(successPosts[0].contentType, /application\/json/);
  const sent = successPosts[0].body;
  assert.equal(sent.formType, "contact");
  assert.equal(sent.product, "leasemate");
  assert.equal(sent.sourceSite, "https://leasemate.singletonsd.com");
  assert.equal(sent.sourcePage, "/contact");
  assert.equal(sent.name, "Ada Lovelace");
  assert.equal(sent.email, "ada@example.com");
  assert.equal(sent.company, "Example House");
  assert.equal(sent.phone, "+61 400 000 000");
  assert.equal(sent.consent, true);
  assert.equal(sent.consentTextVersion, "leasemate-privacy-2026-11-23");
  assert.equal(sent.marketingOptIn, false);
  assert.equal(sent.turnstileToken, "test-turnstile-token");
  assert.match(sent.submissionId, /^[0-9a-f-]{36}$/i);
  assert.match(sent.message, /I am a… House owner/);
  assert.equal("role" in sent, false);
  assert.ok(JSON.stringify(sent).length < 16 * 1024);

  await page.unroute("https://api.singletonsd.com/v1/leads");

  const errorPosts = await mockLeads(async () => ({
    status: 400,
    json: { error: "payload_invalid", details: ["email"] },
  }));
  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.locator("#contact-name").fill("Ada Lovelace");
  await page.locator("#contact-company").fill("Example House");
  await page.locator("#contact-email").fill("ada@example.com");
  await page.locator("#contact-role").selectOption("Lease holder");
  await page
    .locator("#contact-message")
    .fill("Please follow up about a room lease.");
  await page.locator("#contact-consent").check();
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await page.locator("[data-contact-form-submit]").click();
  await page.waitForSelector("[data-contact-form-error]:not([hidden])");
  const errorText = await page.locator("[data-contact-form-error]").innerText();
  assert.match(errorText, /Email/i);
  assert.equal(errorPosts.length, 1);

  await page.unroute("https://api.singletonsd.com/v1/leads");

  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await page.locator("[data-contact-form-submit]").click();
  await page.waitForSelector("#contact-name-error");
  assert.equal(
    await page.locator("#contact-name").getAttribute("aria-describedby"),
    "contact-name-error",
  );
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "contact-name",
  );

  let retryCalls = 0;
  const retryPosts = await mockLeads(async () => {
    retryCalls += 1;
    if (retryCalls === 1) {
      return { status: 500, json: { error: "upstream" } };
    }
    return {
      status: 202,
      json: { id: "550e8400-e29b-41d4-a716-446655440002" },
    };
  });
  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.locator("#contact-name").fill("Ada Lovelace");
  await page.locator("#contact-company").fill("Example House");
  await page.locator("#contact-email").fill("ada@example.com");
  await page.locator("#contact-role").selectOption("Other");
  await page
    .locator("#contact-message")
    .fill("Retry without changing the payload.");
  await page.locator("#contact-consent").check();
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await page.locator("[data-contact-form-submit]").click();
  await page.waitForSelector("[data-contact-form-error]:not([hidden])");
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await page.locator("[data-contact-form-submit]").click();
  await page.waitForSelector("[data-contact-form-success]:not([hidden])");
  assert.equal(retryPosts.length, 2);
  assert.equal(
    retryPosts[0].body.submissionId,
    retryPosts[1].body.submissionId,
  );
  assert.match(retryPosts[0].body.submissionId, /^[0-9a-f-]{36}$/i);

  await page.unroute("https://api.singletonsd.com/v1/leads");

  const conflictPosts = await mockLeads(async () => ({
    status: 409,
    json: { error: "idempotency_payload_conflict" },
  }));
  await page.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
  await page.locator("#contact-name").fill("Ada Lovelace");
  await page.locator("#contact-company").fill("Example House");
  await page.locator("#contact-email").fill("ada@example.com");
  await page.locator("#contact-role").selectOption("Other");
  await page.locator("#contact-message").fill("Idempotency payload conflict.");
  await page.locator("#contact-consent").check();
  await page.waitForFunction(
    () => !document.querySelector("[data-contact-form-submit]")?.disabled,
  );
  await page.locator("[data-contact-form-submit]").click();
  await page.waitForSelector("[data-contact-form-error]:not([hidden])");
  const conflictText = await page
    .locator("[data-contact-form-error]")
    .innerText();
  assert.match(conflictText, /try again/i);
  assert.equal(conflictPosts.length, 1);

  await page.unroute("https://api.singletonsd.com/v1/leads");

  const disabledPosts = await mockLeads(async () => ({
    status: 404,
    json: { error: "function_disabled" },
  }));
  await page.goto(`${origin}/waitlist/`, { waitUntil: "networkidle" });
  await page.locator("#waitlist-name").fill("Ada Lovelace");
  await page.locator("#waitlist-email").fill("ada@example.com");
  await page.locator("#waitlist-consent").check();
  assert.equal(await page.locator("#waitlist-marketing").isChecked(), false);
  await page.waitForFunction(
    () => !document.querySelector("[data-waitlist-form-submit]")?.disabled,
  );
  await page.locator("[data-waitlist-form-submit]").click();
  await page.waitForSelector("[data-waitlist-form-error]:not([hidden])");
  const waitlistError = await page
    .locator("[data-waitlist-form-error]")
    .innerText();
  assert.match(waitlistError, /temporarily unavailable/i);
  assert.equal(disabledPosts.length, 1);
  assert.equal(disabledPosts[0].body.formType, "waitlist");
  assert.equal(disabledPosts[0].body.product, "leasemate");
  assert.equal(disabledPosts[0].body.feature, "waitlist");
  assert.equal(
    disabledPosts[0].body.sourceSite,
    "https://leasemate.singletonsd.com",
  );

  await page.unroute("https://api.singletonsd.com/v1/leads");
  const waitlistSuccess = await mockLeads(async () => ({
    status: 202,
    json: { id: "550e8400-e29b-41d4-a716-446655440001" },
  }));
  await page.goto(`${origin}/waitlist/`, { waitUntil: "networkidle" });
  await page.locator("#waitlist-name").fill("Ada Lovelace");
  await page.locator("#waitlist-email").fill("ada@example.com");
  await page.locator("#waitlist-consent").check();
  await page.waitForFunction(
    () => !document.querySelector("[data-waitlist-form-submit]")?.disabled,
  );
  await page.locator("[data-waitlist-form-submit]").click();
  await page.waitForSelector("[data-waitlist-form-success]:not([hidden])");
  assert.equal(waitlistSuccess.length, 1);
  assert.equal(waitlistSuccess[0].body.formType, "waitlist");

  const failContext = await browser.newContext();
  await failContext.route("https://support.singletonsd.com/**", (route) =>
    route.abort(),
  );
  const failPage = await failContext.newPage();
  try {
    let allowTurnstileScript = false;
    await failPage.route(
      (url) =>
        url.hostname === "challenges.cloudflare.com" &&
        url.pathname.includes("/turnstile/"),
      async (route) => {
        if (!allowTurnstileScript) {
          await route.abort("failed");
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: TURNSTILE_STUB_SCRIPT,
        });
      },
    );
    await failPage.goto(`${origin}/contact/`, { waitUntil: "networkidle" });
    await failPage.waitForSelector("[data-lead-turnstile-retry]");
    const loadError = await failPage
      .locator("[data-contact-form-error]:not([hidden])")
      .innerText();
    assert.equal(loadError.trim(), TURNSTILE_LOAD_ERROR);
    assert.equal(
      await failPage.locator("[data-contact-form-submit]").isDisabled(),
      true,
    );
    allowTurnstileScript = true;
    await failPage.locator("[data-lead-turnstile-retry]").click();
    await failPage.waitForFunction(
      () => !document.querySelector("[data-contact-form-submit]")?.disabled,
    );
  } finally {
    await failContext.close();
  }

  console.log("lead-forms: ok");
} finally {
  await browser.close();
  await new Promise((resolve) => leadOnServer.close(resolve));
}
