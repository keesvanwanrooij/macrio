# Supabase Auth email templates (Macrio)

Paste these into **Supabase → Authentication → Email Templates**. The app does not send mail itself.

| Template in dashboard | File | Suggested subject |
|---|---|---|
| Confirm signup | [`confirm-signup.html`](confirm-signup.html) | `Bevestig je Macrio-account / Confirm your Macrio account` |
| Reset password | [`reset-password.html`](reset-password.html) | `Reset je Macrio-wachtwoord / Reset your Macrio password` |

Both use Supabase’s `{{ .ConfirmationURL }}` (works for confirm and recovery links).

## Redirect URLs (required for reset)

**Authentication → URL Configuration → Redirect URLs** should include:

- Your confirm browser URL (same as `EXPO_PUBLIC_AUTH_REDIRECT_URL`, e.g. `http://localhost:3000`)
- `macrio://**` (store / custom scheme)
- The Expo Linking URL from a running app (log `getPasswordResetRedirectUrl()` once, or allow `exp://**` while using Expo Go)

## Confirm email toggle

- Founder testing: may stay **OFF** for faster sign-up.
- When verifying **v0.2.0** and before **public 1.0.0**: turn **Confirm email ON**.
