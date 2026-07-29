# Phase 11 — Owner Setup Guide

**For:** the store owner. Every step here is something **you** do, not something the agent
does. Creating accounts and handling API keys are your actions.

**What the agent does instead:** writes the code that consumes these values, keeps
`.env.example` as the contract, and never places a real key in any file that gets committed.

---

## Read this first — the ordering trap

Three of these services need to know your **deployed URL**, and you don't have one until
you deploy. So the sequence is deliberately two-pass:

1. **Pass 1 (steps 1–5):** create accounts and collect the values that don't depend on a URL.
2. **Deploy (step 6):** Vercel assigns you a URL like `nostalgia-xxxx.vercel.app`.
3. **Pass 2 (steps 7–8):** go back and fill the URL into Google OAuth and Stripe's webhook.

Trying to do it in one pass is the single most common way this gets frustrating. Expect to
revisit Google and Stripe once.

**Never paste a key into chat, a code file, or a commit.** Keys go in two places only: your
local `.env` file (already gitignored) and the Vercel dashboard.

---

## Step 0 — Generate your auth secret

This one needs no account. Run it and keep the output:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

→ **`NEXTAUTH_SECRET`**

This signs your session cookies. Use a *different* value locally and in production.

---

## Step 1 — Neon (the database)

1. Go to **neon.tech** and sign up (GitHub or Google login is fastest).
2. **Create a project.** Name it `nostalgia`. Pick the region closest to your customers —
   this is the one choice here you can't easily change later.
3. Open the project dashboard and find the **connection string**. Neon shows a toggle
   between *pooled* and *direct* connections — **you need both**:
   - The **pooled** one has `-pooler` in the hostname → **`DATABASE_URL`**
   - The **direct** one does not → **`DIRECT_URL`**

**Why both:** Vercel runs your app as short-lived serverless functions. Dozens of them can
start at once, and each would open its own database connection — Postgres runs out and
starts refusing them. The pooled connection sits in front and shares a small set of real
connections. But database *migrations* can't run through a pooler, so those use the direct
one. This is why the schema needs a `directUrl` setting.

Free tier is generous and fine for launch.

---

## Step 2 — Google Cloud (real sign-in)

You're creating an OAuth client so people can "Sign in with Google."

1. Go to **console.cloud.google.com**. Accept terms if prompted.
2. **Create a project** — top-left project dropdown → *New Project*. Name it `Nostalgia`.
3. Configure the **OAuth consent screen**. In the left menu look under *APIs & Services*.
   Google has been reorganizing this area and may label it **Google Auth Platform** or
   **Branding** — if the menu doesn't match exactly, look for wording about *consent* or
   *branding*. You want:
   - **User type: External**
   - App name: `Nostalgia`
   - User support email + developer contact: your email
   - **Scopes: leave the defaults.** You only need email and profile. Do not add anything
     else — extra scopes are what trigger Google's lengthy verification review.
4. **Publishing status: leave it on "Testing".** Then add **test users** — the email
   addresses of everyone doing UAT, including your own. Testing mode works immediately with
   no review. Only listed addresses can sign in, which is exactly what you want right now.
5. **Credentials** → *Create Credentials* → **OAuth client ID** → Application type
   **Web application**.
6. For now add only the local entries — you'll add the production ones in step 7:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

   That redirect path is fixed by NextAuth. It must match character for character —
   no trailing slash.
7. Copy the two values shown:

→ **`GOOGLE_CLIENT_ID`** and **`GOOGLE_CLIENT_SECRET`**

**Also decide now:** which Google account is the store owner. That address becomes
**`OWNER_EMAIL`**, and it is the *only* account that can reach `/admin`.

---

## Step 3 — Stripe (payments)

1. Go to **dashboard.stripe.com/register** and create an account.
2. **Stay in Test mode.** There's a toggle in the dashboard — leave it on. Test mode uses
   fake card numbers and moves no real money. This is where we're staying for this phase.
3. **Developers → API keys.** Copy:
   - Publishable key, starts `pk_test_` → **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`**
   - Secret key, starts `sk_test_` → **`STRIPE_SECRET_KEY`**

   The secret key is shown once. Treat it like a password.

4. **The webhook endpoint comes later** (step 8) because it needs your deployed URL.

**To test payments locally**, install the Stripe CLI (stripe.com/docs/stripe-cli), then:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints a secret starting `whsec_` — that's your **local** `STRIPE_WEBHOOK_SECRET`.
Production gets a different one.

**Test card:** `4242 4242 4242 4242`, any future expiry, any CVC, any postcode.

**Not now, but eventually:** turning on live payments requires submitting business details
and a bank account, and Stripe reviews it. That's the go-live step you're deferring.

---

## Step 4 — Resend (confirmation emails)

1. Go to **resend.com** and sign up.
2. **API Keys** → create one. Copy it → **`RESEND_API_KEY`**
3. **Skip domain verification for now** — you chose the free `.vercel.app` URL, and you
   can't add DNS records to a domain you don't own.

**The limitation this creates, stated plainly:** with no verified domain you send from
Resend's shared `onboarding@resend.dev` address, and Resend will **only deliver to the email
address on your own Resend account**. Your UAT testers will trigger the email and you'll see
it work — but the mail won't reach their inboxes.

→ **`EMAIL_FROM`** = `Nostalgia <onboarding@resend.dev>` for now.

When you buy a domain later: add it under *Domains*, Resend gives you DNS records to paste
at your registrar, and then `EMAIL_FROM` becomes something like `orders@yourdomain.com`.
That's an environment variable change — no code change.

---

## Step 5 — Local `.env`

Fill in your local file with everything so far. Set `ALLOW_DEMO_LOGIN="true"` locally.

The agent will update `.env.example` with the full variable list as part of the phase, so
the contract is documented in the repo — with empty values, never real ones.

---

## Step 6 — GitHub + Vercel (deployment)

There's currently **no git remote** on this project, so:

1. Create an empty repository on **github.com** — **private**.
2. Connect and push (replace the URL with yours):

```bash
git remote add origin https://github.com/YOUR-USERNAME/nostalgia.git
```

```bash
git push -u origin master
```

Your `.env` is gitignored and untracked — I verified this. Your keys will not be pushed.

3. Go to **vercel.com**, sign up with GitHub, **Import** the repository.
4. Before clicking Deploy, add **every environment variable** in the Vercel project settings
   — the same names as your local `.env`, with these differences:
   - `NEXTAUTH_SECRET` — a **fresh** value, not your local one
   - `NEXTAUTH_URL` — you won't know this until after the first deploy; set it in step 7
   - `ALLOW_DEMO_LOGIN` — `true` for UAT
5. Deploy. Note the URL you're given, e.g. `nostalgia-abc123.vercel.app`.

The first deploy may fail if `NEXTAUTH_URL` is missing. That's expected — fix it in step 7
and redeploy.

---

## Step 7 — Go back to Google with your real URL

In Google Cloud → Credentials → your OAuth client, **add** (don't replace — keep the
localhost entries so local dev keeps working):

- Authorized JavaScript origins: `https://nostalgia-abc123.vercel.app`
- Authorized redirect URIs: `https://nostalgia-abc123.vercel.app/api/auth/callback/google`

Then in Vercel set `NEXTAUTH_URL` = `https://nostalgia-abc123.vercel.app` (no trailing
slash) and redeploy.

---

## Step 8 — Go back to Stripe with your real URL

Stripe dashboard → **Developers → Webhooks → Add endpoint**:

- Endpoint URL: `https://nostalgia-abc123.vercel.app/api/stripe/webhook`
- Event to listen for: **`checkout.session.completed`**

Stripe shows a **signing secret** starting `whsec_`. Add it to Vercel as
**`STRIPE_WEBHOOK_SECRET`** and redeploy.

**Why this matters more than it looks:** right now the app creates an order marked *pending*
and nothing ever marks it *paid* — I verified there is no webhook code anywhere in the
repository. This endpoint is what closes that loop, and it's also what triggers the
confirmation email. Without it, a customer could pay and their order would sit pending
forever.

---

## Complete variable reference

| Variable | From | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | Step 0 | Different value locally vs production |
| `NEXTAUTH_URL` | Step 7 | No trailing slash |
| `DATABASE_URL` | Neon | The **pooled** string (`-pooler` in host) |
| `DIRECT_URL` | Neon | The **direct** string, for migrations |
| `GOOGLE_CLIENT_ID` | Google Cloud | |
| `GOOGLE_CLIENT_SECRET` | Google Cloud | |
| `OWNER_EMAIL` | You | The only account that reaches `/admin` |
| `STRIPE_SECRET_KEY` | Stripe | `sk_test_` for now |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | `pk_test_` for now |
| `STRIPE_WEBHOOK_SECRET` | Step 8 | Different value for CLI vs production |
| `RESEND_API_KEY` | Resend | |
| `EMAIL_FROM` | Step 4 | `Nostalgia <onboarding@resend.dev>` for now |
| `ALLOW_DEMO_LOGIN` | You | `true` for UAT, `false` at go-live |

---

## What is deliberately NOT here

These are the go-live actions, reserved for your signal:

- Switching Stripe to **live keys** and activating real payments
- Publishing the Google consent screen from **Testing** to **Production**
- Setting `ALLOW_DEMO_LOGIN` to `false`
- Buying a domain and verifying it with Resend
- Replacing the placeholder copy on `/shipping` and `/returns`

---

*Written 2026-07-29 as part of Phase 11 discussion. Service dashboards change their
layouts — if a menu label doesn't match, the value you're looking for is still described
above by what it does.*
