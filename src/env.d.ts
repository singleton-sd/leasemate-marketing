/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_LEAD_INTAKE_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
