import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

const {
  LEAD_BODY_MAX_BYTES,
  LEAD_CONSENT_TEXT_VERSION,
  LEAD_INTAKE_URL,
  LEAD_PRODUCT,
  LEAD_SOURCE_SITE,
  LEAD_WAITLIST_FEATURE,
  buildLeadRequest,
  leadAttemptFingerprint,
  leadRequestBytes,
  mapLeadHttpError,
  sourcePageFromLocation,
  submissionIdForAttempt,
  submitLeadRequest,
} = await import(
  pathToFileURL(new URL("src/lib/lead-intake.ts", root).pathname).href
);

const SUBMISSION_ID = "550e8400-e29b-41d4-a716-446655440000";

function waitlistInput(overrides = {}) {
  return {
    formType: "waitlist",
    submissionId: SUBMISSION_ID,
    name: "Ada Lovelace",
    email: "Ada@Example.com",
    company: "Analytical Engines",
    consent: true,
    marketingOptIn: false,
    turnstileToken: "test-turnstile-token",
    website: "",
    sourcePage: "/contact",
    ...overrides,
  };
}

test("waitlist payload matches the job-kit lead schema fields", () => {
  const body = buildLeadRequest(waitlistInput());

  assert.equal(body.sourceSite, LEAD_SOURCE_SITE);
  assert.equal(body.sourceSite, "https://leasemate.singletonsd.com");
  assert.equal(body.sourcePage, "/contact");
  assert.equal(body.submissionId, SUBMISSION_ID);
  assert.equal(body.name, "Ada Lovelace");
  assert.equal(body.email, "ada@example.com");
  assert.equal(body.company, "Analytical Engines");
  assert.equal(body.consent, true);
  assert.equal(body.consentTextVersion, LEAD_CONSENT_TEXT_VERSION);
  assert.equal(body.marketingOptIn, false);
  assert.equal(body.turnstileToken, "test-turnstile-token");
  assert.equal(body.formType, "waitlist");
  assert.equal(body.product, LEAD_PRODUCT);
  assert.equal(body.product, "leasemate");
  assert.equal(body.feature, LEAD_WAITLIST_FEATURE);
  assert.equal(body.feature, "waitlist");
  assert.equal("role" in body, false);
  assert.ok(leadRequestBytes(body) < LEAD_BODY_MAX_BYTES);
});

test("omits empty optional fields and keeps honeypot only when filled", () => {
  const emptyHoneypot = buildLeadRequest(
    waitlistInput({ company: "  ", website: "" }),
  );
  assert.equal(emptyHoneypot.company, undefined);
  assert.equal(emptyHoneypot.website, undefined);

  const spam = buildLeadRequest(
    waitlistInput({ website: "https://spam.example" }),
  );
  assert.equal(spam.website, "https://spam.example");
});

test("sourcePage strips Astro preview base and trailing slashes", () => {
  assert.equal(sourcePageFromLocation("/contact/", "/"), "/contact");
  assert.equal(
    sourcePageFromLocation("/pr-preview/pr-9/contact/", "/pr-preview/pr-9/"),
    "/contact",
  );
  assert.equal(sourcePageFromLocation("/", "/"), "/");
});

test("maps 400 field paths, 404 function_disabled, and retry statuses", () => {
  const invalid = mapLeadHttpError(400, {
    error: "payload_invalid",
    details: ["email", "consent"],
  });
  assert.equal(invalid.kind, "validation");
  assert.match(invalid.message, /Email/);
  assert.match(invalid.message, /Consent/);

  const disabled = mapLeadHttpError(404, { error: "function_disabled" });
  assert.equal(disabled.kind, "unavailable");

  for (const status of [403, 429, 500, 503]) {
    const retry = mapLeadHttpError(status, { error: "turnstile_failed" });
    assert.equal(retry.kind, "retry", `status ${status}`);
  }
});

test("retries reuse submissionId until the form payload changes", () => {
  const first = leadAttemptFingerprint(waitlistInput());
  const kept = submissionIdForAttempt(SUBMISSION_ID, null, first);
  assert.equal(kept.submissionId, SUBMISSION_ID);
  assert.equal(kept.rotated, false);

  const edited = leadAttemptFingerprint(waitlistInput({ name: "Ada 2" }));
  const rotated = submissionIdForAttempt(SUBMISSION_ID, first, edited);
  assert.notEqual(rotated.submissionId, SUBMISSION_ID);
  assert.equal(rotated.rotated, true);
});

test("submitLeadRequest posts JSON to the shared API", async () => {
  const posts = [];
  const fetchImpl = async (url, init) => {
    posts.push({ url, init });
    return new Response(JSON.stringify({ id: SUBMISSION_ID }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await submitLeadRequest(
    buildLeadRequest(waitlistInput()),
    fetchImpl,
  );
  assert.equal(result.ok, true);
  assert.equal(posts[0].url, LEAD_INTAKE_URL);
  assert.equal(posts[0].init.method, "POST");
  const sent = JSON.parse(posts[0].init.body);
  assert.equal(sent.formType, "waitlist");
  assert.equal(sent.product, "leasemate");
});
