/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_LEAD_INTAKE_ENABLED?: string;
  readonly PUBLIC_CHATWOOT_WEBSITE_TOKEN?: string;
  readonly PUBLIC_CHATWOOT_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
