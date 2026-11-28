# GitHub Pages deployment

The production site is built from `main` by `.github/workflows/pages.yml` and
published from the root of the `gh-pages` branch to:

<https://leasemate.singletonsd.com>

In-repository pull requests run the complete build gate and publish beneath
`https://leasemate.singletonsd.com/pr-preview/pr-<number>/`. The preview
workflow:

1. Posts a **sticky PR comment** with the live preview link
2. Puts a managed **Preview** section at the **top** of the PR body
3. Runs `pnpm test:a11y` against the `/` PR build (home, features, pricing, contact, waitlist, privacy, terms, 404)
4. Captures Playwright full-page screenshots (desktop 1440, mobile 390, and 375) for every built HTML route, plus hover/focus, open mobile nav, and
   contact and waitlist form states (flag on only in the screenshot harness). Compares
   each default route to a **build of the PR base SHA**, and hosts a report
   at `…/pr-<number>/visual/`
5. Runs a required **`visual-review`** status check that **fails** when any
   route is `changed` or `new` vs that base build. New routes still capture
   the baseline `404` page as “before” when a baseline dist exists. The first
   PR against an empty `main` skips the local baseline (`VISUAL_SKIP_BASE=1`)
   because `main` has no `package.json`.
6. Removes the preview deploy and hides the sticky comment when the PR closes

Pull requests from forks are not given write access to publish.

Build, tests, and visual capture run with `contents: read` and
`persist-credentials: false`. A separate deploy job downloads the `dist`
artifact, mints a short-lived **singleton-release** GitHub App token
(`vars.RELEASE_APP_ID` and `secrets.RELEASE_APP_PRIVATE_KEY`, limited to this
repository), and passes that token to the gh-pages push. There is no
`GITHUB_TOKEN` fallback on the push path. Adding the App (or its secrets) to
this repository is a Pato step.

A label-triggered **`visual-review`** run still downloads the visual artifact
for the current PR head and fails unless `manifest.headSha` matches that head.

## Visual review and accept

1. Open the sticky **Preview** comment → **Open visual report**
2. If **`visual-review`** is red, review base / PR / diff
3. When the changes are intentional, add the **`visual-accepted`** label
4. A thin workflow run clears **`visual-review`** automatically (no rebuild)
   only if the reviewed artifact is for the current head SHA

## One-time GitHub Pages configuration

Configure the repository to deploy GitHub Pages from the `gh-pages` branch and
the repository root. Set the custom domain to `leasemate.singletonsd.com`.
The production build includes a matching `CNAME` file so branch deployments
retain the custom domain.

GitHub Pages from the `gh-pages` branch runs Jekyll, which hides paths that
start with `_` (including Astro's `/_astro/` assets). Production and preview
builds include an empty `.nojekyll` so those files are served.

Workflow `GITHUB_TOKEN` stays read-only. The singleton-release GitHub App
needs to be installed on this repository (Pato) so Pages deploys can mint a
write token.

GitHub provisions the TLS certificate after DNS resolves. Enable **Enforce
HTTPS** only after the certificate is available.

Do not change DNS from this repository. Singleton Server adds a Route 53
CNAME to `singleton-sd.github.io` only after Pato OKs.

## Build-time PUBLIC_* settings (Azure App Configuration)

Preview and production builds read non-secret `PUBLIC_*` keys from the Azure
App Configuration store `ssd-global-appcs-build-prod-ae` over GitHub OIDC
(ADR-010). Unlabeled keys are the shared default; the `leasemate-marketing`
label overrides them. GitHub repository variables are not the source of
truth for these keys.

| Key                             | Purpose                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `PUBLIC_LEAD_INTAKE_ENABLED`    | Build-time contact/waitlist POST. Off until [SSD-718](https://app.clickup.com/t/14ymjnwa4hh) |
| `PUBLIC_TURNSTILE_SITE_KEY`     | Cloudflare Turnstile site key baked into static JS when lead intake is on                    |
| `PUBLIC_CHATWOOT_WEBSITE_TOKEN` | Public Chatwoot website-inbox token for inbox "LeaseMate Marketing Site"                     |
| `PUBLIC_CHATWOOT_BASE_URL`      | Chatwoot origin. Production value: `https://support.singletonsd.com`                         |

Bots change values through the Azure MCP connector (or the portal). Trigger a
rebuild with **workflow_dispatch** on `pages.yml` after a value change. Never
commit the Turnstile secret; job-kit verifies tokens.

The inline Azure login + `az appconfig kv list --endpoint` step is a stopgap.
[SSD-1235](https://app.clickup.com/t/14ymjnwcw8c) replaces it with the shared
`singleton-sd/.github` workflow.

The Chatwoot widget stays off when either Chatwoot key is unset. The loader
sets `window.chatwootSettings = { darkMode: "dark" }` before the SDK script
loads. Bubble colour is configured on the Chatwoot inbox.

GitHub Pages does not ship a Content-Security-Policy today. If one is added
later, allow `https://support.singletonsd.com` for `script-src` and
`frame-src`, and both `https://support.singletonsd.com` and
`wss://support.singletonsd.com` for `connect-src`.
