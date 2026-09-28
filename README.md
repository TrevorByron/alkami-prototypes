# Commentor

Commentor is a small internal review space for hosted prototypes. Teams can sign in with Alkami Slack, open a prototype in a controlled viewer, leave viewport-aware pins, discuss them in threads, and notify the owner in Slack.

## Local setup

Requirements: Node.js 22+, a Supabase project, and a Slack app configured for Slack OIDC.

```sh
cp .env.example .env
npm install
npm run dev
```

Set the public browser values in `.env`:

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Open `http://127.0.0.1:5173/#/signin` after starting Vite. Restart Vite after changing environment values.

## Supabase and Slack setup

1. In Supabase Auth, enable the `slack_oidc` provider and configure its Slack client credentials. Add the Supabase Auth callback URL shown by the project to the Slack app.
2. Apply the migrations with `supabase db push`.
3. Create a Supabase Vault secret named `ALLOWED_SLACK_TEAM_ID` containing the Alkami Slack team ID. The auth trigger fails closed when it is missing or does not match the Slack identity claim.
4. Configure these Supabase Edge Function secrets:

   - `ALLOWED_SLACK_TEAM_ID`
   - `APP_ORIGIN` — the origin allowed by `check-embed` for frame ancestor checks
   - `APP_URL` — the public app URL used in Slack deep links
   - `SLACK_BOT_TOKEN`

   The Slack bot needs permission to list users/channels, post messages, reply in threads, and add the `white_check_mark` reaction. Test only in the Slack test channel selected for this project.

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
- In the viewer, choose a device width, switch to Comment mode, and click the frame to place a pin.
- `?comment=<comment-id>` selects the thread, switches to its saved viewport, and pulses the pin.
- Replies, resolve/reopen, and Slack notifications are non-blocking follow-up actions after the database write succeeds.

## Known limits

- Pins record the viewport-relative position at creation time and do not follow page scrolling.
- Some SSO prototypes cannot be authenticated inside an iframe. The viewer provides a popup sign-in flow and a new-tab fallback.
- Safari and Firefox may still require opening SSO-heavy prototypes in a new tab.
- The iframe sandbox intentionally does not allow top-level navigation.
- Screenshots, thumbnails, attachments, drawing tools, @mentions, email, per-prototype permissions, and Slack interactive buttons are out of scope for this MVP.
- Slack failures show a toast after the review write; they do not roll back the comment, reply, or status change.
