# LeaseMate marketing

Public marketing site for LeaseMate, a Singleton SD product.

Production: <https://leasemate.singletonsd.com>

## Local development

Requirements: Node.js 22.12 or newer and pnpm 11.

```sh
pnpm install
pnpm dev
```

Run the full local quality gate with `pnpm verify`.

## Architecture

- Astro static-site generation
- strict TypeScript
- Tailwind CSS with a LeaseMate semantic token layer
- Markdown content collections under `src/content/pages`
- Decap CMS at `/admin/`
- GitHub Pages at `leasemate.singletonsd.com`

The shared `@singleton-sd/tokens` 1.8.0 package is installed from the
GitLab npm registry (`@singleton-sd` scope in `.npmrc`). LeaseMate aliases
(`--lm-*`) in `src/styles/global.css` map to those token roles. Primary
button labels stay black on gold.

Logos in `public/` are copied from
[`leasemate-assets`](https://github.com/singleton-sd/leasemate-assets)
PR #1 (`feature/leasemate-brand-assets-44bb`) and should be re-synced from
`main` once that PR merges.

Contact and waitlist POST to `https://api.singletonsd.com/v1/leads` is gated by
`PUBLIC_LEAD_INTAKE_ENABLED` (off by default until [SSD-718](https://app.clickup.com/t/14ymjnwa4hh)).

The Chatwoot live-chat widget is gated by `PUBLIC_CHATWOOT_WEBSITE_TOKEN` and
`PUBLIC_CHATWOOT_BASE_URL` (off when either is unset). Umami page analytics are
gated by `PUBLIC_UMAMI_WEBSITE_ID` (off when unset) via
`@singleton-sd/analytics-kit` from the public npm registry. CI bakes `PUBLIC_*`
values from Azure App Configuration, not GitHub repository variables.
