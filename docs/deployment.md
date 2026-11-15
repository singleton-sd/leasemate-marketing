# GitHub Pages deployment

The production site is built from `main` by `.github/workflows/pages.yml` and
published from the root of the `gh-pages` branch to:

<https://leasemate.singletonsd.com>

In-repository pull requests run the complete build gate and publish beneath
`https://leasemate.singletonsd.com/pr-preview/pr-<number>/`. The preview
workflow:

1. Posts a **sticky PR comment** with the live preview link
2. Puts a managed **Preview** section at the **top** of the PR body
3. Captures Playwright full-page screenshots (desktop 1440, mobile 390, and 375) for every built HTML route, plus hover/focus, open mobile nav, and
   waitlist form states (flag on only in the screenshot harness). Compares
   each default route to a **build of the PR base SHA**, and hosts a report
   at `…/pr-<number>/visual/`
4. Runs a required **`visual-review`** status check that **fails** when any
   route is `changed` or `new` vs that base build. New routes still capture
   the baseline `404` page as “before” when a baseline dist exists. The first
   PR against an empty `main` skips the local baseline (`VISUAL_SKIP_BASE=1`)
   because `main` has no `package.json`.
5. Removes the preview deploy and hides the sticky comment when the PR closes

Pull requests from forks are not given write access to publish.

## Visual review and accept

1. Open the sticky **Preview** comment → **Open visual report**
2. If **`visual-review`** is red, review base / PR / diff
3. When the changes are intentional, add the **`visual-accepted`** label
4. A thin workflow run clears **`visual-review`** automatically (no rebuild)

## One-time GitHub Pages configuration

Configure the repository to deploy GitHub Pages from the `gh-pages` branch and
the repository root. Set the custom domain to `leasemate.singletonsd.com`.
The production build includes a matching `CNAME` file so branch deployments
retain the custom domain.

Under **Settings > Actions > General > Workflow permissions**, select **Read
and write permissions**.

GitHub provisions the TLS certificate after DNS resolves. Enable **Enforce
HTTPS** only after the certificate is available.

Do not change DNS from this repository. Singleton Server adds a Route 53
CNAME to `singleton-sd.github.io` only after Pato OKs.

## Waitlist / Turnstile

| Variable                     | Purpose                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `PUBLIC_LEAD_INTAKE_ENABLED` | Build-time flag. Off by default until [SSD-718](https://app.clickup.com/t/14ymjnwa4hh) |
| `PUBLIC_TURNSTILE_SITE_KEY`  | Cloudflare Turnstile site key baked into static JS when the flag is on                 |

Never commit the Turnstile secret; job-kit verifies tokens.
