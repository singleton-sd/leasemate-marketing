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

The shared `@singleton-sd/tokens` package is hosted in a private registry.
This repository therefore keeps the matching CSS variables in
`src/styles/global.css` so installs and CI need no registry credential.
LeaseMate aliases (`--lm-*`) are defined in that same file.

Logos in `public/` are copied from
[`leasemate-assets`](https://github.com/singleton-sd/leasemate-assets)
PR #1 (`feature/leasemate-brand-assets-44bb`) and should be re-synced from
`main` once that PR merges.

Waitlist POST to `https://api.singletonsd.com/v1/leads` is gated by
`PUBLIC_LEAD_INTAKE_ENABLED` (off by default until [SSD-718](https://app.clickup.com/t/14ymjnwa4hh)).
