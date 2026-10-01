# Alkami Prototypes

Alkami Prototypes is a shared internal review space for hosted prototypes. Teams can sign in with an Alkami email magic link, discover prototypes built by teammates, open a prototype in a controlled viewer, capture screenshot-based feedback, and discuss it in threads. Slack identity and notifications remain optional for a future integration.

## Local setup

Requirements: Node.js 22+ and a Supabase project.

```sh
cp .env.example .env
npm install
npm run dev
```

Set the public browser values in `.env`:

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_ALLOWED_EMAIL_DOMAIN=alkami.com
VITE_SLACK_NOTIFICATIONS_ENABLED=false
```

Open `http://127.0.0.1:5173/#/signin` after starting Vite. Restart Vite after changing environment values.

## Supabase and access setup

1. In Supabase Auth, keep Email enabled for Magic Links and add the local/public app URL to the allowed redirect URLs.
2. Apply the migrations with `supabase db push`, including `20260928170000_email_auth.sql`, `20260929090000_backfill_email_profiles.sql`, and `20260929100000_comment_snapshots.sql`. The auth trigger fails closed when the email domain does not match the configured Alkami domain.
3. The migration defaults to `alkami.com`. If the company domain ever changes, update the `ALLOWED_EMAIL_DOMAIN` Supabase Vault secret used by the database trigger and the matching Edge Function secret. The browser-side `VITE_ALLOWED_EMAIL_DOMAIN` is only a UX convenience; the database trigger is the security boundary.
4. Slack is intentionally optional. When approval is available later, configure these Edge Function secrets and set `VITE_SLACK_NOTIFICATIONS_ENABLED=true`:

   - `ALLOWED_EMAIL_DOMAIN`
   - `APP_ORIGIN` — the origin allowed by `check-embed` for frame ancestor checks
   - `APP_URL` — the public app URL used in Slack deep links
   - `SLACK_BOT_TOKEN`

   The Slack bot needs permission to list users/channels, post messages, reply in threads, and add the `white_check_mark` reaction. Slack-specific profile fields and prototype channel fields remain nullable so Slack can be added later without changing comment ownership.

The `check-embed` Edge Function decides whether a prototype can be shown in the live frame or should open in a new tab. If it has not been deployed yet, the Add prototype dialog falls back safely to new-tab mode so a prototype can still be added.

## Deploying to GitLab Pages

The default branch publishes the Vite build through the `pages` job. The Vite base path is derived from `CI_PAGES_URL`, so project Pages URLs work without a SPA fallback.

Add these GitLab CI variables before deploying:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`

The `deploy-functions` job is manual and deploys `check-embed`, `slack-directory`, and `notify-slack`. Function secrets are configured in Supabase, never in GitLab source files.

## Review flow

- Add a URL and blur the field to run `check-embed`.
- `example.com` should be eligible for a live frame; sites that reject framing, such as GitHub, are marked new-tab-only.
- The comments panel is visible by default with a general comment composer at the top and a scrollable YouTube-style conversation below. Replies stay nested under the comment they belong to.
- A comment can include an optional image attachment. Reviewers can use the attachment button or drag an image onto the comment input; it previews before posting and appears inline with the comment afterward.
- Attachments upload to a private Supabase Storage bucket; no screen-sharing permission, iframe bridge, or DOM access is involved.
- General comments can be posted from the persistent comments panel. They have no screenshot or page association and remain visible across the prototype.
- Replies, resolve/reopen, and Slack notifications are non-blocking follow-up actions after the database write succeeds.

## Known limits

- Images must be selected by the reviewer and are limited to 10 MB in the composer.
- Some SSO prototypes cannot be authenticated inside an iframe. The viewer provides a popup sign-in flow and a new-tab fallback.
- Safari and Firefox may still require opening SSO-heavy prototypes in a new tab.
- The iframe sandbox intentionally does not allow top-level navigation.
- No prototype-side bridge, selector tagging, or DOM inspection is required.

- Automatic screen capture, drawing tools, @mentions, email, per-prototype permissions, and Slack interactive buttons are out of scope for this MVP.
- Slack failures show a toast after the review write; they do not roll back the comment, reply, or status change.
