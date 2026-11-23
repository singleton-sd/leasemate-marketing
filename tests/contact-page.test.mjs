import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

test("contact page uses shared chrome and a split MetaPair + form layout", async () => {
  const page = await readFile(new URL("src/pages/contact.astro", root), "utf8");
  const content = await readFile(
    new URL("src/content/pages/contact.md", root),
    "utf8",
  );

  assert.match(page, /BaseLayout/);
  assert.match(page, /ContactForm/);
  assert.match(page, /MetaPair/);
  assert.match(page, /contact-page/);
  assert.doesNotMatch(page, /hello@|mailto:|support@/);
  assert.match(content, /eyebrow: Contact/);
  assert.match(content, /Talk to us about LeaseMate\./);
  assert.match(content, /Contact form opening soon/);
  assert.doesNotMatch(content, /hello@|mailto:|support@/);
});

test("contact form posts JSON to the shared lead-intake API", async () => {
  const island = await readFile(
    new URL("src/components/ContactFormIsland.tsx", root),
    "utf8",
  );
  const form = await readFile(
    new URL("src/components/ContactForm.astro", root),
    "utf8",
  );
  const page = await readFile(new URL("src/pages/contact.astro", root), "utf8");

  assert.match(island, /buildLeadRequest/);
  assert.match(island, /submitLeadRequest/);
  assert.match(island, /formType: "contact"/);
  assert.match(island, /TurnstileWidget/);
  assert.match(island, /zodResolver|contactFormSchema/);
  assert.match(island, /handleSubmit/);
  assert.match(island, /data-contact-form-error/);
  assert.match(island, /data-contact-form-success/);
  assert.match(island, /contact-consent/);
  assert.match(island, /marketingOptIn/);
  assert.match(island, /CONTACT_ROLE_OPTIONS/);
  assert.doesNotMatch(island, /PostKit|postkitApiBaseUrl/);
  assert.doesNotMatch(island, /X-PostKit-Contact-Preview/);
  assert.doesNotMatch(island, /hello@|mailto:|support@/);
  assert.match(form, /withBase\("\/privacy"/);
  assert.match(form, /PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(form, /PUBLIC_LEAD_INTAKE_ENABLED/);
  assert.match(form, /data-contact-opening-soon/);
  assert.match(form, /client:load/);
  assert.match(form, /ContactFormIsland/);
  assert.doesNotMatch(island, /Preview form|Nothing was sent/);
  assert.doesNotMatch(form, /Preview form|Nothing was sent/);
  assert.doesNotMatch(page, /Preview form|Nothing was sent/);
});

test("contact form prefills role/name/email from safe query params", async () => {
  const schema = await readFile(
    new URL("src/lib/contact-form-schema.ts", root),
    "utf8",
  );
  const sync = await readFile(
    new URL("src/lib/form-query-sync.ts", root),
    "utf8",
  );
  const hook = await readFile(
    new URL("src/hooks/useZodFormQuerySync.ts", root),
    "utf8",
  );
  const island = await readFile(
    new URL("src/components/ContactFormIsland.tsx", root),
    "utf8",
  );
  const form = await readFile(
    new URL("src/components/ContactForm.astro", root),
    "utf8",
  );

  assert.match(schema, /ROLE_QUERY_TO_OPTION/);
  assert.match(schema, /ROLE_OPTION_TO_QUERY/);
  assert.match(schema, /resolveRoleOption/);
  assert.match(schema, /owner:\s*"House owner"/);
  assert.match(schema, /lease:\s*"Lease holder"/);
  assert.match(schema, /agent:\s*"Agent \/ house manager"/);
  assert.match(schema, /other:\s*"Other"/);
  assert.match(schema, /SAFE_EMAIL_RE/);
  assert.match(schema, /SAFE_NAME_MAX/);
  assert.match(schema, /ROLE_OPTION_VALUES\.has\(trimmed\)/);
  assert.match(schema, /contactFormSchema/);
  assert.match(schema, /contactFormQuerySchema/);
  assert.match(schema, /Organisation is required/);

  assert.match(sync, /history\.replaceState/);
  assert.match(sync, /replaceUrlSearchParam/);

  assert.match(hook, /useZodFormQuerySync/);
  assert.match(hook, /parseQueryWithSchema/);
  assert.match(
    hook,
    /replaceUrlSearchParam|history\.replaceState|replaceState/,
  );
  assert.match(hook, /popstate/);

  const zodQuery = await readFile(
    new URL("src/lib/zod-form-query.ts", root),
    "utf8",
  );
  assert.match(zodQuery, /parseQueryWithSchema/);
  assert.match(zodQuery, /serializeQueryWithSchema/);

  assert.match(island, /useZodFormQuerySync/);
  assert.match(island, /zodResolver/);
  assert.match(island, /useForm/);
  assert.match(island, /contactFormQuerySerializers|serializeRoleQuery/);
  assert.match(form, /client:load/);
  assert.match(form, /ContactFormIsland/);

  // Regression: each email segment must reject C0/DEL controls (e.g. %00 / NUL).
  assert.match(
    schema,
    /SAFE_EMAIL_RE\s*=\s*\/\^[^\n]*\\u0000-\\u001f\\u007f[^\n]*\\u0000-\\u001f\\u007f[^\n]*\\u0000-\\u001f\\u007f/,
  );

  const {
    SAFE_EMAIL_RE,
    resolveRoleOption,
    parseNameFromQuery,
    parseEmailFromQuery,
    serializeRoleQuery,
    serializeNameQuery,
    serializeEmailQuery,
    contactFormQuerySchema,
    contactFormSchema,
    SAFE_NAME_MAX,
  } = await import(
    pathToFileURL(new URL("src/lib/contact-form-schema.ts", root).pathname).href
  );

  const { parseQueryWithSchema, serializeQueryWithSchema } = await import(
    pathToFileURL(new URL("src/lib/zod-form-query.ts", root).pathname).href
  );

  assert.equal(SAFE_EMAIL_RE.test("user@example.com"), true);
  assert.equal(SAFE_EMAIL_RE.test("user\u0000@example.com"), false);
  assert.equal(SAFE_EMAIL_RE.test("user@exam\u0007ple.com"), false);
  assert.equal(SAFE_EMAIL_RE.test("user@example.com\u007f"), false);

  assert.equal(resolveRoleOption("owner"), "House owner");
  assert.equal(resolveRoleOption("house"), "House owner");
  assert.equal(resolveRoleOption("lease"), "Lease holder");
  assert.equal(resolveRoleOption("holder"), "Lease holder");
  assert.equal(resolveRoleOption("agent"), "Agent / house manager");
  assert.equal(resolveRoleOption("manager"), "Agent / house manager");
  assert.equal(resolveRoleOption("other"), "Other");
  assert.equal(resolveRoleOption("general"), "Other");
  assert.equal(resolveRoleOption("House owner"), "House owner");
  assert.equal(resolveRoleOption("unknown-role"), null);
  assert.equal(resolveRoleOption(""), null);
  assert.equal(resolveRoleOption(null), null);

  assert.equal(parseNameFromQuery("Ada Lovelace"), "Ada Lovelace");
  assert.equal(parseNameFromQuery("  Ada  "), "Ada");
  assert.equal(parseNameFromQuery("bad\u0000name"), "");
  assert.equal(parseNameFromQuery(""), "");
  assert.equal(parseNameFromQuery(null), "");

  assert.equal(parseEmailFromQuery("user@example.com"), "user@example.com");
  assert.equal(parseEmailFromQuery("  user@example.com  "), "user@example.com");
  assert.equal(parseEmailFromQuery("user\u0000@example.com"), "");
  assert.equal(parseEmailFromQuery("not-an-email"), "");
  assert.equal(parseEmailFromQuery(null), "");

  assert.equal(serializeRoleQuery("House owner"), "owner");
  assert.equal(serializeRoleQuery("Lease holder"), "lease");
  assert.equal(serializeRoleQuery("Agent / house manager"), "agent");
  assert.equal(serializeRoleQuery("Other"), "other");
  assert.equal(serializeRoleQuery(""), null);
  assert.equal(serializeNameQuery("Ada"), "Ada");
  assert.equal(serializeNameQuery("  "), null);
  assert.equal(serializeEmailQuery("ada@example.com"), "ada@example.com");
  assert.equal(serializeEmailQuery("not-an-email"), null);

  const parsed = parseQueryWithSchema(
    contactFormQuerySchema,
    new URLSearchParams(
      "role=owner&name=Ada&email=ada@example.com&company=secret",
    ),
  );
  assert.equal(parsed.role, "House owner");
  assert.equal(parsed.name, "Ada");
  assert.equal(parsed.email, "ada@example.com");
  assert.equal("company" in parsed, false);

  const serialized = serializeQueryWithSchema(contactFormQuerySchema, parsed, {
    serialize: {
      role: serializeRoleQuery,
      name: serializeNameQuery,
      email: serializeEmailQuery,
    },
  });
  const asMap = Object.fromEntries(
    serialized.map(({ param, value }) => [param, value]),
  );
  assert.equal(asMap.role, "owner");
  assert.equal(asMap.name, "Ada");
  assert.equal(asMap.email, "ada@example.com");

  const invalid = parseQueryWithSchema(
    contactFormQuerySchema,
    new URLSearchParams("role=nope&name=bad\u0000&email=nope"),
  );
  assert.equal(invalid.role, "");
  assert.equal(invalid.name, "");
  assert.equal(invalid.email, "");

  const formOk = contactFormSchema.safeParse({
    name: "Ada",
    company: "LeaseMate",
    phone: "",
    email: "ada@example.com",
    role: "House owner",
    message: "Hello",
    consent: true,
    marketingOptIn: false,
    website: "",
  });
  assert.equal(formOk.success, true);

  const formBad = contactFormSchema.safeParse({
    name: "",
    company: "",
    phone: "",
    email: "nope",
    role: "",
    message: "",
    consent: false,
    marketingOptIn: false,
    website: "",
  });
  assert.equal(formBad.success, false);
  assert.equal(SAFE_NAME_MAX, 120);
});

test("contact content describes live enquiry delivery", async () => {
  const content = await readFile(
    new URL("src/content/pages/contact.md", root),
    "utf8",
  );
  const island = await readFile(
    new URL("src/components/ContactFormIsland.tsx", root),
    "utf8",
  );
  const publicCopy = `${content}\n${island}`;

  assert.match(publicCopy, /Send message/);
  assert.match(publicCopy, /Message sent/);
  assert.doesNotMatch(publicCopy, /preview only/i);
  assert.doesNotMatch(
    publicCopy,
    /\b(guaranteed|proven roi|industry-leading|best-in-class|revenue lift)\b/i,
  );
});
