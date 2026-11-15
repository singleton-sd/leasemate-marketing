import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("LeaseMate lockup and app-icon favicons are vendored locally", () => {
  for (const rel of [
    "public/favicon.svg",
    "public/favicon-32.png",
    "public/apple-touch-icon.png",
    "public/brand/leasemate-lockup-on-dark-transparent.svg",
    "public/og-image.png",
  ]) {
    assert.ok(existsSync(fileURLToPath(new URL(rel, root))), `missing ${rel}`);
  }
});
