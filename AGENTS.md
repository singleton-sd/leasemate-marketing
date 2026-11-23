# AGENTS.md — LeaseMate marketing

This repository is private. Never commit secrets, credentials, customer
information, or commercially sensitive ClickUp content. The Turnstile site
key is public config and may be committed as an Actions variable name only.

## Stack and quality gate

- Astro SSG, strict TypeScript, Tailwind CSS, and Markdown content collections.
- Use semantic CSS variables from `src/styles/global.css`.
- Husky runs `pnpm format:check` + `pnpm lint` on **pre-commit**, and
  `pnpm verify` on **pre-push**.
- Keep the site fully static. Lead intake is a browser POST behind
  `PUBLIC_LEAD_INTAKE_ENABLED`.
- Do not copy `scripts/resolve-postkit-api-base-url.sh` or other PostKit
  leftovers from InkAds.

## Copy

Keep public copy conservative. Do not claim unvalidated scale, performance,
revenue, or launch dates. Pricing stays a labelled placeholder until the
product owner publishes it. Privacy and terms are published as drafts for
legal review; keep PLACEHOLDER items as written until the product owner
replaces them.
