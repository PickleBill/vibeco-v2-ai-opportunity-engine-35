# Reddit API keys — step-by-step walkthrough

> Bill: you've hit walls on this. Here's the version that actually works in 2026.
> Total time: ~5 minutes if everything cooperates, ~15 if Reddit's UI is being weird.

## What you're getting

Two strings that the `signal-collect` edge function will use to log into
Reddit's official API as your bot, so we can pull posts/comments cleanly
instead of scraping:

- `REDDIT_CLIENT_ID` — short string (~20 chars)
- `REDDIT_CLIENT_SECRET` — longer string (~30 chars)

Both go into Lovable Cloud secrets (already wired in code; just paste the values).

## Step 1 — Make sure you're logged into the Reddit account you want this tied to

Use a real account that has been around > 30 days and has some karma.
**A brand-new account will get its API requests throttled or shadow-rejected.**
If you don't have one, use your personal account; the app key is invisible to others.

## Step 2 — Open the Reddit apps preferences page

Direct link: <https://www.reddit.com/prefs/apps>

(If that 404s, the path can also be: profile menu → User Settings → Safety
& Privacy → scroll to "Apps and Permissions" → "App Authorization" → there's
a link out to the developer apps page.)

Scroll to the bottom — you'll see a button: **"are you a developer? create an app..."**

Click it. A small form expands inline.

## Step 3 — Fill the form

| Field | Value | Why |
|---|---|---|
| **name** | `vibeco-signal-mine` | Any name. This is what shows in your authorized-apps list. |
| **App type** (radio) | **`script`** ← important | "script" is the personal-use tier. Doesn't need OAuth redirects. Don't pick "web app" or "installed app". |
| **description** | (leave blank or "Pain mining for VibeCo") | Optional. |
| **about url** | (leave blank) | Not required for script type. |
| **redirect uri** | `http://localhost:8080` | **Reddit requires *something*** here even though script type doesn't use it. Anything valid-looking works. localhost is fine. |

Hit **"create app"**.

## Step 4 — Grab the two strings

You'll land back on the apps page with your new app at the top, in a grey box.
It looks like:

```
vibeco-signal-mine        personal use script
[ a1b2c3d4e5f6g7h8 ]     ← THIS IS THE CLIENT_ID (right under the app name, small text)
secret: xyz123...mnop      ← CLIENT_SECRET (next to the word "secret")
```

**Gotcha**: the `client_id` is the line **under the app name** in tiny mono font,
NOT the `personal use script` label and NOT the redirect URI. It's the only
short hex-ish string on that card.

To reveal the full secret, click "edit" on the app card — the secret renders in plain text in the edit form.

## Step 5 — Paste them into Lovable Cloud

In the Lovable chat (here), say:

> "Add secret REDDIT_CLIENT_ID = `<paste>` and REDDIT_CLIENT_SECRET = `<paste>`"

I'll wire them in. You don't need to redeploy anything; Supabase Edge Functions
pick up new secrets on the next invocation.

## Step 6 — Verify

Run a scan from `/signal` (admin only). In the live scan stepper, you should
now see **`Reddit · N`** with a green check instead of being skipped. If it
still shows `skipped`, the secret names don't match what the adapter reads —
ping me with the exact stepper output and I'll fix it.

## Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| The "create an app" button does nothing | Reddit's UI sometimes silently requires you to verify your email first | Check your account email, verify if pending |
| `401 Unauthorized` in edge function logs | Wrong app type (you picked "web app") | Delete the app, recreate as `script` |
| `429 Too Many Requests` immediately | Account is too new or has no karma | Use a different account |
| Secret string looks like it ends mid-word | UI truncation — you didn't grab the full thing | Click "edit" on the app, copy from the form field |
| Adapter still skipped after secrets added | Secret names mismatch | Tell Lovable; should be exactly `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` |

## What if you genuinely cannot get past the form?

Two fallbacks, in order of preference:

1. **Use a different machine / browser** — Reddit's app-creation page has been
   flaky in Safari and certain ad-blocker setups. Try Firefox or a fresh
   Chrome profile.
2. **Skip it for now** — we already have 1,154 real signals from HN, Trustpilot,
   G2, Capterra, and web search. Reddit makes the engine fatter, not the
   product viable. Publishing without it is fine.
