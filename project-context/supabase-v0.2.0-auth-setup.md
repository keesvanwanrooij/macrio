# What to do next in Supabase (v0.2.0 auth emails)

Scratchpad for you, the founder. The **app code is already done**. Supabase is the online dashboard that sends emails and decides which links are allowed. You finish that part by hand (about 10–15 minutes).

Open your project: [supabase.com](https://supabase.com) → **macrio** (or whatever you named it).

---

<details>
<summary><strong>Step 1 — Allow the app’s links (Redirect URLs)</strong></summary>

### Why

When someone clicks “confirm email” or “reset password”, Supabase opens a link. If that link’s destination is **not** on an allow-list, Supabase blocks it. Your phone app needs to be on that list.

### What to click

1. Left sidebar → **Authentication**
2. Open **URL Configuration** (sometimes under **Settings** inside Authentication)

### What to set

**Site URL** (one main address):

- Set to: `http://localhost:3000`
- Do **not** put your `xxxx.supabase.co` project URL here.

**Redirect URLs** (allow-list; add **each** of these as its own line):

| Add this | What it is for |
|---|---|
| `http://localhost:3000` | Same as `EXPO_PUBLIC_AUTH_REDIRECT_URL` in `app/.env` (email confirm landing) |
| `macrio://**` | Future / store builds that use the `macrio` app scheme |
| `exp://**` | Expo Go while you test on your phone |

Save if the dashboard asks you to.

### Check your app `.env`

In `app/.env` you should already have something like:

```env
EXPO_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000
```

That value must match what you put in **Site URL** / the localhost redirect row.

### Reminder for public launch (v1.0.0)

What you have now is **founder / Expo Go** setup:

- Site URL: `http://localhost:3000`
- Redirects: localhost + `macrio://**` + `exp://**`

Before real users / store launch, go back to **Authentication → URL Configuration** and:

1. Change **Site URL** to your real production page (the default redirect when nothing else matches; wildcards are **not** allowed here).
2. Update **Redirect URLs** so production matches (add the real `https://…` URL; keep `macrio://**`; remove `exp://**` if you no longer use Expo Go).
3. Update `EXPO_PUBLIC_AUTH_REDIRECT_URL` in the production app env to the same production URL.

Also listed on `ROADMAP.md` → **v1.0.0** and `docs/process/RELEASE_CHECKLIST.md`.

</details>

---

<details>
<summary><strong>Step 2 — Paste the branded email templates</strong></summary>

### Why

By default, Supabase sends plain, generic emails. We wrote Macrio-looking HTML for you. Supabase does **not** read those files from Git automatically. You **copy-paste** them into the dashboard once.

### Where the files live on your PC

Folder:

`backend/supabase/email-templates/`

| File | Paste into this Supabase template |
|---|---|
| `confirm-signup.html` | **Confirm signup** |
| `reset-password.html` | **Reset password** |

### What to click

1. **Authentication** → **Email Templates**
2. Open **Confirm signup**
3. Open `confirm-signup.html` in Cursor (or Notepad)
4. Select all → copy → paste into the **Body** (HTML) field in Supabase
5. Suggested **Subject**:

   `Bevestig je Macrio-account / Confirm your Macrio account`

6. Save
7. Open **Reset password**
8. Paste everything from `reset-password.html`
9. Suggested **Subject**:

   `Reset je Macrio-wachtwoord / Reset your Macrio password`

10. Save

Leave the special placeholders like `{{ .ConfirmationURL }}` alone. Supabase replaces those with the real button link.

</details>

---

<details>
<summary><strong>Step 3 — Password length (quick)</strong></summary>

1. **Authentication** → **Providers** → **Email**
2. Set **minimum password length** to **8** (Macrio already checks this in the app)
3. Save

</details>

---

<details>
<summary><strong>Step 4 — Turn “Confirm email” ON (when you want to test v0.2.0 for real)</strong></summary>

### What this switch means

| Confirm email | What happens when someone signs up |
|---|---|
| **OFF** | They are logged in immediately (fast for casual founder testing) |
| **ON** | They must open the email link before they can sign in (how production should work) |

### What to do for this release

1. **Authentication** → **Providers** → **Email**
2. Turn **Confirm email** **ON**
3. Save

Do this when you are ready to **verify** the 0.2.0 patch. Leave it **ON** toward public launch.

If you need a quick throwaway account again later, you can turn it OFF temporarily, then turn it back ON.

</details>

---

<details>
<summary><strong>Step 5 — How to test (simple checklist)</strong></summary>

Use a real email inbox you can open on the **same phone** that runs Expo Go.

### A) Confirm signup (Confirm email ON)

1. In the app: create a **new** account with that email
2. App should say something like “confirm your email”
3. Open the inbox → Macrio confirm mail → tap the link
4. Go back to the app → **Sign in** with that email + password
5. You should get in

### B) Forgot password

1. Sign out (or use the welcome / sign-in screen)
2. Tap **Forgot password?** / **Wachtwoord vergeten?**
3. Enter the email → send link (use **`npx expo start --tunnel`** in `app/` while on Expo Go)
4. Open the reset mail on the **phone** only (not the PC)
5. App should open and show **New password** / **Nieuw wachtwoord** (not the diary tabs)
6. Save → sign in with the new password

If the app opens but you land on home/tabs: reload with the latest code (root deep-link handler). Metro should log `[auth] createSessionFromUrl:` then navigate to reset.

</details>

---

<details>
<summary><strong>If something breaks</strong></summary>

| Symptom | Likely fix |
|---|---|
| Email never arrives | Check spam. In Supabase: **Authentication** → **Users** → your user exists. Free projects have email rate limits. Custom SMTP comes at **v1.0.0** (macrio.nl / macrio.app). |
| Link opens browser: **localhost:3000 niet bereikbaar** | **Expected failure mode today.** Supabase log shows `redirect_to=http://localhost:3000` when it rejected the real Expo URL (LAN IP). Fix: stop Metro → `npx expo start --tunnel` → reload app → send a **new** reset. Metro should log `redirectTo` with an `exp.direct` host, not `192.168.…`. |
| PC shows `localhost:3000/?code=…` then phone shows `otp_expired` | The PC already used the one-time link. Never open the reset mail on the PC. Request a fresh email and open it only on the phone. |
| `otp_expired` / `email link is invalid or has expired` | Link was already used, too old, or **prefetched** by the mail app / antivirus (common). Request a fresh reset and open it quickly, once, on the phone. |
| Link says “redirect not allowed” | Step 1: add the missing Redirect URL and save |
| Confirm mail works but reset does not | Reset needs `exp://**` (Expo Go) or `macrio://**`; re-check Step 1 |
| Emails look ugly / default Supabase text | Step 2: templates not pasted, or wrong template tab |
| Can sign in without confirming | Confirm email is still **OFF** (Step 4) |

Official longer docs: root `SETUP.md` and `backend/supabase/email-templates/README.md`.

</details>

---

## Short “done” list

- [ ] Redirect URLs: localhost + `macrio://**` + `exp://**`
- [ ] Paste confirm + reset HTML templates
- [ ] Min password length = 8
- [ ] Confirm email **ON** (for real v0.2.0 check)
- [ ] Tested signup confirm + forgot password on phone

When all boxes are ticked, Supabase is caught up with the v0.2.0 app code.
