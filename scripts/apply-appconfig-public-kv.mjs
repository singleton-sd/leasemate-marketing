/**
 * Apply `az appconfig kv list` JSON from stdin.
 *
 * Unlabeled values are written first, then labeled ones (the label wins).
 * PUBLIC_* keys go to GITHUB_ENV. Every read is logged to the job summary
 * and stdout (allowed because these are non-secret PUBLIC_* values).
 *
 * Fails if any item is a Key Vault reference or its key is not PUBLIC_*.
 */
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const KEY_VAULT_CONTENT_TYPE =
  "application/vnd.microsoft.appconfig.keyvaultref+json";

export function contentTypeOf(item) {
  return String(item?.contentType ?? item?.content_type ?? "");
}

export function isKeyVaultReference(item) {
  return contentTypeOf(item).includes("vnd.microsoft.appconfig.keyvaultref");
}

export function itemKey(item) {
  return String(item?.key ?? "");
}

export function itemLabel(item) {
  const raw = item?.label;
  if (raw === null || raw === undefined || raw === "") return "";
  return String(raw);
}

export function itemValue(item) {
  return item?.value == null ? "" : String(item.value);
}

export function applyAppConfigPublicKv(items) {
  const applied = [];
  const audit = [];

  if (!Array.isArray(items)) {
    throw new Error("App Configuration list must be a JSON array.");
  }

  for (const item of items) {
    const key = itemKey(item);
    const label = itemLabel(item);
    if (isKeyVaultReference(item)) {
      throw new Error(
        `Refusing Key Vault reference for ${key || "(missing key)"} (content type ${KEY_VAULT_CONTENT_TYPE}).`,
      );
    }
    if (!key.startsWith("PUBLIC_")) {
      throw new Error(
        `Refusing App Configuration key ${JSON.stringify(key)} because it is not PUBLIC_*.`,
      );
    }
    audit.push({
      key,
      label: label || "(unlabeled)",
      value: itemValue(item),
      etag: String(item?.etag ?? item?.eTag ?? ""),
      lastModified: String(item?.lastModified ?? item?.last_modified ?? ""),
    });
  }

  const unlabeled = items.filter((item) => itemLabel(item) === "");
  const labeled = items.filter((item) => itemLabel(item) !== "");
  const byKey = new Map();
  for (const item of [...unlabeled, ...labeled]) {
    const key = itemKey(item);
    byKey.set(key, itemValue(item));
  }
  for (const [key, value] of byKey) {
    applied.push({ key, value });
  }

  return { applied, audit };
}

export function githubEnvBlock(key, value) {
  return `${key}<<APPCONFIG_EOF\n${value}\nAPPCONFIG_EOF\n`;
}

export function auditSummaryMarkdown(audit) {
  const rows = audit
    .map(
      (row) =>
        `| \`${row.key}\` | \`${row.label}\` | \`${row.value.replaceAll("|", "\\|")}\` | \`${row.etag}\` | \`${row.lastModified}\` |`,
    )
    .join("\n");
  return [
    "## Azure App Configuration PUBLIC_* audit",
    "",
    "Store: `ssd-global-appcs-build-prod-ae`. Unlabeled values apply first; the `leasemate-marketing` label wins.",
    "",
    "| Key | Label | Value | ETag | Last modified |",
    "| --- | --- | --- | --- | --- |",
    rows || "| — | — | — | — | — |",
    "",
  ].join("\n");
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}

const isCli =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  const raw = await readStdin();
  if (!raw.trim()) {
    throw new Error(
      "App Configuration list was empty. az appconfig kv list produced no JSON.",
    );
  }
  let items;
  try {
    items = JSON.parse(raw);
  } catch (err) {
    throw new Error("App Configuration JSON was not parseable.", {
      cause: err,
    });
  }
  const { applied, audit } = applyAppConfigPublicKv(items);
  const envPath = process.env.GITHUB_ENV;
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (envPath) {
    for (const { key, value } of applied) {
      appendFileSync(envPath, githubEnvBlock(key, value));
    }
  }
  const summary = auditSummaryMarkdown(audit);
  if (summaryPath) {
    appendFileSync(summaryPath, `${summary}\n`);
  }
  for (const row of audit) {
    console.log(
      `appconfig key=${row.key} label=${row.label} value=${row.value} etag=${row.etag} lastModified=${row.lastModified}`,
    );
  }
  console.log(`appconfig applied ${applied.length} PUBLIC_* key(s)`);
}
