# Security review — 2026-10-22

Review of the public Velocity Contracting site (`velocity-contracting-site`, commit `3e748d4` on `main`). Scope: secrets and API keys in the tree and in git history, form handlers and their endpoints, third-party script integrity, and security headers (`netlify.toml`; there is no `_headers` file).

History was not rewritten. Nothing was merged or deployed. The live site was checked with response headers only. The Supabase anon key found in the repo was used to test what an unauthenticated caller can do. Row contents (names, emails, phone numbers, quote text) are not copied into this file. No account was created and no database row was changed.

Line numbers for issues that this branch removes are the lines on `3e748d4` before the fix. Later sections cite the lines in this branch.

## Result

| Severity | Count | Fixed in this branch |
| --- | --- | --- |
| Critical | 1 | Credential removed from the working tree. The key still works until it is rotated. |
| High | 5 | Script integrity, quote-page Content-Security-Policy, referrer meta, Netlify header additions, and the unauthenticated quote upload handler. |
| Medium | 4 | Reported only. |
| Low | 2 | Reported only. |

Git history across 89 commits contains one JWT and no `service_role` key, AWS access key, GitHub token, Slack token, or PEM private key.

## C-1 — Critical. Supabase anon key in the site and in git history

The quote pages embed a Supabase JWT and send it as `apikey` and `Authorization: Bearer` to `https://onqrpoynxfnhadjnedwb.supabase.co`. The payload is `role: anon`, `ref: onqrpoynxfnhadjnedwb`, issued 2026-08-15, expires 2036-08-14. It is an anon key, not a service-role key. Anon keys are meant for browsers only when Row Level Security actually limits them. This key can read contact data.

Present on `3e748d4` at:

| File | Line |
| --- | --- |
| `quotes/1811-s-quebec-169-b42e70/index.html` | 211 |
| `quotes/s-a4fc068763/index.html` | 290 |
| `quotes/s-de8c72441c-stage/index.html` | 290 |
| `quotes/t-2438a17b1a/index.html` | 55 |
| `quotes/t-2438a17b1a/p1/a/index.html` | 256 |
| `quotes/t-2438a17b1a/p1/b/index.html` | 256 |
| `quotes/t-2438a17b1a/p2/a/index.html` | 256 |
| `quotes/t-2438a17b1a/p2/b/index.html` | 256 |
| `quotes/w-8d37883a3f/options/index.html` | 55 |
| `quotes/w-8d37883a3f/options/p1/a/index.html` | 257 |
| `quotes/w-8d37883a3f/options/p1/b/index.html` | 257 |
| `quotes/w-8d37883a3f/options/p1/c/index.html` | 257 |
| `quotes/w-8d37883a3f/options/p2/a/index.html` | 257 |
| `quotes/w-8d37883a3f/options/p2/b/index.html` | 257 |
| `quotes/w-8d37883a3f/options/p2/c/index.html` | 257 |

The same token is in git history from `c850bb6` (2026-10-03, “1811 S Quebec sub pages: activity log”) through `3e748d4`. Deleting it from the latest files does not remove it from those commits.

**Exploit.** The public repo and the live GitHub Pages URL both serve the token (Pages returned HTTP 200 for `/quotes/s-a4fc068763/` on 2026-10-22). With that token:

- `GET /rest/v1/providers` returned **12 rows** whose columns include `contact_email`, `phone`, `name`, `company`, `city`, `state`, `blurb`, `kind`, and `rating`.
- `GET /rest/v1/stages` returned 9 rows, `lessons` 18, `stage_tasks` 26, and `examples` 6. Those look like product copy, not customer contacts.
- `POST /rest/v1/quote_page_events` with the same JSON shape the pages send was rejected: `new row violates row-level security policy`. The comment in the contractor page said the log was insert-only and unreadable. Inserts from this key do not succeed. `GET` on `quote_page_events` returned no visible rows.
- `GET` on `finances`, `conversations`, `messages`, `profiles`, `team_contacts`, `documents`, `invites`, `listings`, `saved_homes`, `journeys`, `profile_facts`, `action_items`, and `attachments` returned no visible rows. That is either an empty table or a policy that hides every row. It is not proof those tables are empty.
- `walk_accounts`, `pros`, and `board_events` returned permission denied for `anon`.
- Missing-table errors name other real tables (`saved_homes`, `walk_accounts`, `board_events`, and others). That is a schema listing for anyone holding the anon key.
- `GET /rest/v1/` (OpenAPI) correctly requires the service-role key.
- Storage bucket list was empty. Auth settings are finding H-2.

**Fix in this branch.** The token and the browser calls that sent quote snapshots, user agents, and line toggles were removed. Local quote toggles still save in `localStorage`. The key keeps working for anyone who already cloned the repo or who reads an older commit or the current live Pages deploy.

## H-1 — High. The live site sends none of the Netlify security headers

`netlify.toml` lines 9–16 (on `3e748d4`) set `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a Content-Security-Policy. `.github/workflows/pages.yml` lines 24–28 publish the whole repo to GitHub Pages (`path: .`).

A request to `https://velocitycontractingllc.com/` on 2026-10-22 returned `server: GitHub.com` and no Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy. It did send `access-control-allow-origin: *` (GitHub Pages’ default) and `cache-control: max-age=600`. The same was true for a quote URL. `netlify.toml` does not affect that host. `frame-ancestors` inside a `<meta>` Content-Security-Policy is ignored by browsers, so the marketing pages’ meta policy does not stop framing on Pages either.

**Exploit.** The contact form (`contact.html`) can be framed by another site. The first HTTP visit can be downgraded before GitHub’s HTTPS redirect. Quote pages, which had no policy at all, would run any script the HTML pointed at.

**Fix in this branch.**

- `netlify.toml` now also sends `Strict-Transport-Security: max-age=31536000`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, and `object-src 'none'` on the existing policy. These apply when Netlify serves the site.
- Every quote page got a meta Content-Security-Policy that allows the inline scripts and Google Fonts those pages need, allowlists `https://cdnjs.cloudflare.com` for GSAP, and does not allow connections to the Supabase project.
- Marketing pages and quote pages got `<meta name="referrer" content="strict-origin-when-cross-origin">`, which GitHub Pages will emit.

GitHub Pages still cannot send HSTS, `X-Frame-Options`, or `X-Content-Type-Options`. See owner action.

## H-2 — High. Signup is open and email and phone are auto-confirmed

`GET /auth/v1/settings` with the anon key returned `disable_signup: false`, `mailer_autoconfirm: true`, and `phone_autoconfirm: true`. SMS provider is Twilio. This is project configuration, not a file in the repo.

**Exploit.** The anon key from C-1 can call the signup API and receive a confirmed session without proving control of the inbox or the phone. Tables that rejected `anon` (`walk_accounts`, `pros`, `board_events`) may allow the `authenticated` role. That second step was not tested, because it would have created a user.

## H-3 — High. Quote upload handler trusts a 4-digit PIN checked only in the browser

On `3e748d4`:

- `quotes/s-a4fc068763/index.html:64` and `quotes/s-de8c72441c-stage/index.html:64` — hidden `<form name="quote" netlify>` with ten file inputs (`photo1`–`photo10`), plus contractor, phone, totals, and the full quote text.
- Same files, line 97 — SHA-256 hashes for the `elec`, `hvac`, and `javier` PINs. Line 216 compares `SHA-256("q169:" + role + ":" + pin)` to those hashes. The input is `maxlength="4"`.
- Same files, around line 265 — `fetch("/", { method: "POST" })` with that form body. The honeypot field is never sent. The PIN is not sent.

**Exploit.** A direct POST to the Netlify form endpoint does not run the PIN check. Each hash matches a 4-digit PIN (confirmed offline; the PINs are not written here). The prices the PIN is supposed to hide are already in the same HTML (`PRE`, `FIRST`). File type is checked only in the browser. On GitHub Pages today, `POST /` returns **405**, so the live host is not storing these submissions and the page falls through to SMS. `netlify.toml` sets `publish = "."`, so connecting this repo to Netlify would register the form and start accepting anonymous uploads of quote text and files.

**Fix in this branch.** The hidden Netlify form and the `POST /` were removed on both contractor pages. “Send quote” now opens the existing SMS link (`sms:+18062527815`) after refreshing that link. Copy still works. The PIN hashes are still in the file, because deleting them does not invalidate a PIN that is already recoverable from git history, and the quote data is plaintext in the same file.

## H-4 — High. GSAP is loaded from a CDN with no integrity check

On `3e748d4`:

- `quotes/w-8d37883a3f/index.html:110`
- `quotes/s-a4fc068763/index.html:93`
- `quotes/s-de8c72441c-stage/index.html:93`

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
```

**Exploit.** Anyone who can change that CDN response runs JavaScript on the quote origin. Before this branch, that script sat next to the Supabase key, the PIN hashes, and in-browser quote photos.

**Fix in this branch.** Each tag now has `integrity="sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt"` and `crossorigin="anonymous"`, matching the file served by cdnjs on 2026-10-22. The quote-page policy allowlists that host and no other script host.

## H-5 — High. Customer job files are world-readable

`robots.txt` disallows `/quotes/`, and several pages send `noindex`. Both are crawler hints. GitHub Pages returned HTTP 200 for a quote URL, and the directory is in a public git repo.

Examples in this branch:

- `quotes/w-8d37883a3f/history/index.html:5` — the page says “Internal only.”
- `quotes/w-8d37883a3f/options/index.html:42` and `:72` — `MASTER` is true, subcontractor labor and material are in the page, and the UI states that margin is 20 percent of sub cost.
- `quotes/s-a4fc068763/index.html:100` — Spectora report URL `https://reports.spectora.com/v/reports/a6fb8d68-0b53-49a9-84c1-c4258cf3ddbe`. The same URL is linked from the Quebec quote pages and their history copies. The viewer shell returned HTTP 200 and the title “Spectora Report Viewer.” Report photos were not downloaded.

The pages include a street address (1811 S Quebec Way #169), inspection findings, and subcontractor pricing. That is the customer deliverable and, on the master views, internal cost data, published together.

This branch does not delete those pages. They are the live quote links, and removing them from the latest commit would leave them in history.

## M-1 — Medium. Contact form disables Formsubmit’s captcha

- `contact.html:94` — `action="https://formsubmit.co/guess@velocitycontractingllc.com"`
- `contact.html:107` — `<input type="hidden" name="_captcha" value="false">`
- `main.js:99` and `main.js:102` — the same flag and `POST https://formsubmit.co/ajax/guess@velocitycontractingllc.com`

The honeypot (`_gotcha`, `contact.html` around the form) is enforced only in `main.js`. A direct POST to Formsubmit skips it. The endpoint is the public business address, which is already on the page. Impact is automated mail to that inbox, not a database on this site. Not changed.

## M-2 — Medium. Google Fonts stylesheets have no SRI

Quote pages load `https://fonts.googleapis.com/css2?family=...`, for example `quotes/s-a4fc068763/index.html:3` and `quotes/1811-s-quebec-169-b42e70/index.html` (the font `<link>` follows the new policy meta). The CSS body is not stable, so a pinned hash would break the fonts. The new quote-page policy allowlists `fonts.googleapis.com` and `fonts.gstatic.com` and no other style host. Marketing pages do not load these fonts, and their policy does not allow that host.

## M-3 — Medium. Privacy notice does not describe the quote pages

`privacy.html` (the “What we collect” and “What we do not do” sections) says the quote form is emailed through Formsubmit and is not stored on the GitHub Pages host, and that the site does not run third-party marketing trackers. The contact form behaves that way. The `/quotes/` HTML, including property and price details, is stored in this repo and on GitHub Pages. The Supabase calls described in C-1 were a separate send path; this branch removes them. The notice was not rewritten.

## M-4 — Medium. The service worker answers failed quote requests with the marketing homepage

`sw.js:1–17` precaches the marketing shell. `main.js:144–149` registers `./sw.js` from marketing pages. The worker’s scope is the site root, so after that registration it handles `/quotes/` as well. `sw.js:43–52` returns `./index.html` when a GET fails. A failed quote navigation can show the marketing page from cache. Not changed.

## L-1 — Low. GitHub Pages sends `Access-Control-Allow-Origin: *`

Platform default on the live responses. The HTML is already public, so the header does not expose a second copy of a private API.

## L-2 — Low. `style-src 'unsafe-inline'`

`netlify.toml` and the marketing meta policy allow inline styles. The quote pages use inline `<style>` blocks, so their meta policy allows inline styles too. That is required for these pages. It weakens style-based XSS defenses. No object or embed tags were found; `object-src 'none'` was added on the Netlify policy and on the quote-page meta policy.

## What this branch changes

- Removes the Supabase URL and anon JWT from the working tree, and removes the calls that posted quote activity.
- Removes the hidden Netlify `quote` form and the unauthenticated `POST /` on both contractor pages. Send uses the SMS link.
- Pins GSAP 3.12.5 with SHA-384 and `crossorigin="anonymous"`.
- Adds a quote-page Content-Security-Policy and a referrer meta on marketing and quote pages.
- Adds HSTS, COOP, CORP, and `object-src 'none'` to `netlify.toml`.

Inline scripts in `quotes/` were parsed with `node --check` after the edit. The live site was not redeployed, so GitHub Pages still serves the previous files until a normal production deploy.

## Needs owner action

1. **Rotate the Supabase anon key** for project `onqrpoynxfnhadjnedwb`. It remains in git history from `c850bb6` through `3e748d4`, and in the current GitHub Pages deploy until that deploy is replaced. This review did not rewrite history.
2. **Turn on Row Level Security that actually denies `anon` select** on `providers` and review `stages`, `lessons`, `stage_tasks`, and `examples`. Then review policies for the `authenticated` role on `walk_accounts`, `pros`, `board_events`, `finances`, `conversations`, and `messages`.
3. **Disable public signup or turn off `mailer_autoconfirm` and `phone_autoconfirm`.** Confirm whether a newly signed-up user can read the tables `anon` cannot.
4. **Replace the 4-digit contractor PINs.** They are recoverable from the hashes in `quotes/s-a4fc068763/index.html:97` and the staging copy, including older commits. Check them on a server if the quote sheet needs a gate. The sheet’s prices are already in the HTML.
5. **Serve `velocitycontractingllc.com` from a host that can set HTTP headers**, or put a CDN in front of GitHub Pages. `netlify.toml` already has the header set, including the HSTS value added here (`max-age=31536000`, without `includeSubDomains` or `preload`). Add `includeSubDomains` only after every subdomain is HTTPS. GitHub Pages will keep ignoring this file.
6. **Redeploy after this lands** so Pages stops publishing the JWT. Do that from the normal release process. This review did not deploy.
7. **If a Netlify site already has a form named `quote`**, delete that form so old registrations stop accepting uploads.
8. **Revoke the Spectora share** if that URL still opens the inspection. The id is in the quote HTML and in history.
9. **Decide whether `/quotes/` belongs in a public repo.** `robots.txt` does not keep the files private. Unpublishing the latest files still leaves them in git history unless history is rewritten later, on purpose, after the key rotation.
10. **Optional:** set Formsubmit `_captcha` to `true` in `contact.html:107` and `main.js:99` if inbox spam becomes a problem.
