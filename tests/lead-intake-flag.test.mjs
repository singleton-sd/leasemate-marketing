import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

const { isLeadIntakeEnabled } = await import(
  pathToFileURL(new URL("src/lib/lead-intake-flag.ts", root).pathname).href
);

test("lead intake flag is off by default and for empty values", () => {
  assert.equal(isLeadIntakeEnabled(), false);
  assert.equal(isLeadIntakeEnabled(""), false);
  assert.equal(isLeadIntakeEnabled("false"), false);
  assert.equal(isLeadIntakeEnabled("off"), false);
});

test("lead intake flag is on for true/1/yes", () => {
  assert.equal(isLeadIntakeEnabled("true"), true);
  assert.equal(isLeadIntakeEnabled("TRUE"), true);
  assert.equal(isLeadIntakeEnabled("1"), true);
  assert.equal(isLeadIntakeEnabled("yes"), true);
});

test("waitlist form renders the opening-soon branch unless the flag is on", async () => {
  const form = await readFile(
    new URL("src/components/WaitlistForm.astro", root),
    "utf8",
  );
  const envExample = await readFile(new URL(".env.example", root), "utf8");
  assert.match(form, /isLeadIntakeEnabled/);
  assert.match(form, /PUBLIC_LEAD_INTAKE_ENABLED/);
  assert.match(form, /WaitlistFormIsland/);
  assert.match(form, /data-waitlist-opening-soon/);
  assert.match(form, /Waitlist opening soon/);
  assert.match(
    form,
    /The waitlist form is temporarily closed\. Check back here soon\./,
  );
  assert.match(form, /leadIntakeOn \? \(/);
  assert.match(envExample, /PUBLIC_LEAD_INTAKE_ENABLED=false/);
});
