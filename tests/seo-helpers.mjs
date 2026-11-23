/**
 * Escape a string so it can be used as a literal in a RegExp source.
 * Keep this regex as a top-level literal so Prettier does not rewrite
 * `[\]\\]` into a class that fails to escape parentheses.
 */
const REGEXP_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

export function escapeRegExp(value) {
  return value.replace(REGEXP_METACHARACTERS, "\\$&");
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

/**
 * Return the decoded content of `<meta name="{name}">`, ignoring
 * `property="og:description"` and other meta tags.
 */
export function getNamedMetaContent(html, name) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const nameMatch = tag.match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const attrName = nameMatch?.[1] ?? nameMatch?.[2];
    if (attrName !== name) continue;
    const contentMatch = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!contentMatch) return undefined;
    return decodeHtmlEntities(contentMatch[1] ?? contentMatch[2] ?? "");
  }
  return undefined;
}
