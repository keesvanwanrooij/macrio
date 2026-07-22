# Edge Function: `purge-deleted-accounts`

Daily job for GDPR soft-delete grace (v0.3.0). Calls SQL `purge_due_deleted_accounts()` with the service role.

## Deploy

```bash
supabase functions deploy purge-deleted-accounts
```

## Schedule (03:00 UTC daily)

Dashboard: **Edge Functions → purge-deleted-accounts → Schedules** → cron `0 3 * * *`

Or CLI:

```bash
supabase functions schedule create purge-deleted-accounts --cron "0 3 * * *"
```

Optional: set secret `PURGE_CRON_SECRET` and pass `x-cron-secret` / `Authorization: Bearer …` on the schedule request.

## Manual smoke

```bash
curl -X POST "$SUPABASE_URL/functions/v1/purge-deleted-accounts" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Expect `{ "purged": 0 }` when nobody is past the 30-day grace window.
