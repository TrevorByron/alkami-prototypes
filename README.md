# Alkami Prototypes

Alkami Prototypes is a shared internal review space for hosted prototypes. Teams can sign in with an Alkami email magic link, discover prototypes built by teammates, open a prototype in a controlled viewer, leave viewport-aware pins, and discuss them in threads. Slack identity and notifications remain optional for a future integration.

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
2. Apply the migrations with `supabase db push`, including `20260928170000_email_auth.sql`. The auth trigger fails closed when the email domain does not match the configured Alkami domain.
3. The migration defaults to `alkami.com`. If the company domain ever changes, update the `ALLOWED_EMAIL_DOMAIN` Supabase Vault secret used by the database trigger and the matching Edge Function secret. The browser-side `VITE_ALLOWED_EMAIL_DOMAIN` is only a UX convenience; the database trigger is the security boundary.
4. Slack is intentionally optional. When approval is available later, configure these Edge Function secrets and set `VITE_SLACK_NOTIFICATIONS_ENABLED=true`:

   - `ALLOWED_EMAIL_DOMAIN`
   - `APP_ORIGIN` — the origin allowed by `check-embed` for frame ancestor checks
   - `APP_URL` — the public app URL used in Slack deep links
   - `SLACK_BOT_TOKEN`

   The Slack bot needs permission to list users/channels, post messages, reply in threads, and add the `white_check_mark` reaction. Slack-specific profile fields and prototype channel fields remain nullable so Slack can be added later without changing comment ownership.

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
- In the viewer, choose a device width, choose `Pin comment` in the comments panel, and click the frame to place a pin.
- The comments panel is visible by default with an open general-feedback composer. Choose `Pin comment` in that panel only when feedback should target a specific spot in the frame; Browse remains the default interaction mode.
- Comments are scoped to the prototype route that was visible when they were created. The viewer saves the route, scroll position, and (when same-origin access or the bridge below is available) a CSS selector for the clicked element. Switching routes clears the current page's pins and thread list; opening a thread restores its route and scroll context.
- General comments can be posted from the persistent comments panel or the floating action. They have no route, pin, scroll position, or element selector and remain visible across the prototype.
- `?comment=<comment-id>` selects the thread, switches to its saved viewport, and pulses the pin.
- Replies, resolve/reopen, and Slack notifications are non-blocking follow-up actions after the database write succeeds.

## Known limits

- Pins with a saved element selector follow that element while it is available; comments without a selector fall back to their original viewport-relative position.
- Some SSO prototypes cannot be authenticated inside an iframe. The viewer provides a popup sign-in flow and a new-tab fallback.
- Safari and Firefox may still require opening SSO-heavy prototypes in a new tab.
- The iframe sandbox intentionally does not allow top-level navigation.
- Cross-origin SPAs cannot be inspected by the parent page because of browser security. To report client-side route changes, scroll, and the element under review, add this small bridge to the embedded prototype:

  Add `data-commentor-id="unique-name"` to important review targets when possible; those stable identifiers are preferred over generated tag paths.

  ```js
  const selectorFor = (element) => {
    if (!element) return null;
    element = element.closest("[data-commentor-id]") || element;
    if (element.dataset.commentorId) return `[data-commentor-id="${CSS.escape(element.dataset.commentorId)}"]`;
    if (element.id) return `#${CSS.escape(element.id)}`;
    return element.tagName.toLowerCase();
  };

  const reportCommentorContext = (selector = null) => window.parent.postMessage({
    type: "commentor:context",
    url: window.location.href,
    scrollY: window.scrollY,
    selector,
  }, "*");

  ["pushState", "replaceState"].forEach((method) => {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      reportCommentorContext();
      return result;
    };
  });

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (message?.type === "commentor:inspect") {
      const element = document.elementFromPoint(message.x, message.y);
      event.source?.postMessage({
        type: "commentor:inspection",
        requestId: message.requestId,
        url: window.location.href,
        scrollY: window.scrollY,
        selector: selectorFor(element),
      }, event.origin || "*");
    }
    if (message?.type === "commentor:restore") {
      const element = message.selector ? document.querySelector(message.selector) : null;
      if (element) element.scrollIntoView({ block: "center", behavior: "auto" });
      else window.scrollTo({ top: message.scrollY ?? 0, behavior: "auto" });
      reportCommentorContext(message.selector ?? null);
    }
  });

  window.addEventListener("scroll", () => reportCommentorContext(), { passive: true });
  window.addEventListener("popstate", () => reportCommentorContext());
  window.addEventListener("hashchange", () => reportCommentorContext());
  reportCommentorContext();
  ```

  The viewer sends `{ type: "commentor:restore", url, scrollY, selector }` when a thread is opened, so the prototype can call `history.replaceState`/`pushState`, scroll to the selector, or otherwise restore its own route context.
- Screenshots, thumbnails, attachments, drawing tools, @mentions, email, per-prototype permissions, and Slack interactive buttons are out of scope for this MVP.
- Slack failures show a toast after the review write; they do not roll back the comment, reply, or status change.
