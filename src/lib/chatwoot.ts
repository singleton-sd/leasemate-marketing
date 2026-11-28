/** Public Chatwoot website-inbox config. Widget is off when either value is unset. */

export const CHATWOOT_SDK_PATH = "/packs/js/sdk.js";
export const CHATWOOT_LOAD_TIMEOUT_MS = 8_000;

export type ChatwootConfig = {
  websiteToken: string;
  baseUrl: string;
};

export type ChatwootSdk = {
  run: (options: { websiteToken: string; baseUrl: string }) => void;
};

export type ChatwootSettings = {
  darkMode: "dark";
};

declare global {
  interface Window {
    chatwootSDK?: ChatwootSdk;
    chatwootSettings?: ChatwootSettings;
  }
}

export function applyChatwootSettings(): void {
  if (typeof window === "undefined") return;
  window.chatwootSettings = { darkMode: "dark" };
}

export function getChatwootConfig(
  websiteToken?: string,
  baseUrl?: string,
): ChatwootConfig | null {
  const token = (websiteToken ?? "").trim();
  const rawBase = (baseUrl ?? "").trim();
  if (!token || !rawBase) return null;

  try {
    const parsed = new URL(rawBase);
    if (parsed.protocol !== "https:") return null;
    return {
      websiteToken: token,
      baseUrl: parsed.origin,
    };
  } catch {
    return null;
  }
}

export function chatwootSdkSrc(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${CHATWOOT_SDK_PATH}`;
}

export function bootChatwootFromDom(root?: ParentNode | Document): void {
  if (typeof document === "undefined") return;
  const host = (root ?? document).querySelector("[data-chatwoot-loader]");
  if (!(host instanceof HTMLElement)) return;

  const config = getChatwootConfig(
    host.getAttribute("data-chatwoot-website-token") ?? "",
    host.getAttribute("data-chatwoot-base-url") ?? "",
  );
  if (!config) return;

  const parsedTimeout = Number(host.getAttribute("data-chatwoot-timeout-ms"));
  const timeoutMs =
    Number.isFinite(parsedTimeout) && parsedTimeout > 0
      ? parsedTimeout
      : CHATWOOT_LOAD_TIMEOUT_MS;

  loadChatwootSnippet(config, timeoutMs, document);
}

export function loadChatwootSnippet(
  config: ChatwootConfig,
  timeoutMs: number = CHATWOOT_LOAD_TIMEOUT_MS,
  doc?: Document,
): void {
  if (typeof document === "undefined" && !doc) return;
  const d = doc ?? document;
  applyChatwootSettings();
  const t = "script";
  const BASE_URL = config.baseUrl;
  const websiteToken = config.websiteToken;
  const g = d.createElement(t);
  const s = d.getElementsByTagName(t)[0];
  let settled = false;

  const timeoutId = globalThis.setTimeout(() => {
    fail();
  }, timeoutMs);

  function fail(): void {
    if (settled) return;
    settled = true;
    globalThis.clearTimeout(timeoutId);
    g.remove();
  }

  g.src = chatwootSdkSrc(BASE_URL);
  g.async = true;
  g.defer = true;
  g.addEventListener(
    "load",
    () => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeoutId);
      window.chatwootSDK?.run({
        websiteToken,
        baseUrl: BASE_URL,
      });
    },
    { once: true },
  );
  g.addEventListener("error", fail, { once: true });

  if (s?.parentNode) {
    s.parentNode.insertBefore(g, s);
  } else {
    d.head.appendChild(g);
  }
}
