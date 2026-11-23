import assert from "node:assert/strict";
import test from "node:test";

import { escapeRegExp, getNamedMetaContent } from "./seo-helpers.mjs";

test("escapeRegExp escapes parentheses and other metacharacters", () => {
  const description = "Draft (legal review).";
  assert.equal(escapeRegExp(description), String.raw`Draft \(legal review\)\.`);
});

test("escaped descriptions with parentheses match the description meta", () => {
  const description = "Draft (legal review).";
  const html = `<meta name="description" content="${description}" />`;
  assert.match(
    html,
    new RegExp(
      `<meta\\s+name="description"\\s+content="${escapeRegExp(description)}"`,
      "i",
    ),
  );
});

test("getNamedMetaContent requires name=description, not og:description", () => {
  const description = "Draft (legal review).";
  const ogOnly = `<meta property="og:description" content="${description}">`;
  assert.equal(getNamedMetaContent(ogOnly, "description"), undefined);

  const both = `${ogOnly}<meta name="description" content="${description}">`;
  assert.equal(getNamedMetaContent(both, "description"), description);
});
