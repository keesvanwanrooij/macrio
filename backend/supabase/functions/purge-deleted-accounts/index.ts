/*
 * SECTION: Cron job — purge soft-deleted accounts (v0.3.0)
 * WHAT: Daily edge function that hard-deletes auth users past the 30-day grace period.
 * HOW: Call RPC purge_due_deleted_accounts() with the service role key.
 * INPUT: HTTP request from Supabase scheduled trigger (Authorization: Bearer service_role or cron secret)
 * OUTPUT: JSON { purged: number }
 *
 * Schedule in Supabase Dashboard → Edge Functions → purge-deleted-accounts → Cron:
 *   schedule: 0 3 * * *  (03:00 UTC daily)
 * Or: supabase functions schedule purge-deleted-accounts --cron "0 3 * * *"
 *
 * Requires secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected on hosted Supabase).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  try {
    // Optional shared secret so random callers cannot hit the function
    const cronSecret = Deno.env.get('PURGE_CRON_SECRET');
    if (cronSecret) {
      const header = req.headers.get('x-cron-secret') ?? '';
      const auth = req.headers.get('authorization') ?? '';
      const ok =
        header === cronSecret ||
        auth === `Bearer ${cronSecret}` ||
        auth === `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
      if (!ok) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'missing_supabase_env' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc('purge_due_deleted_accounts');
    if (error) {
      console.error('[purge-deleted-accounts]', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const purged = typeof data === 'number' ? data : 0;
    console.log(`[purge-deleted-accounts] purged=${purged}`);
    return new Response(JSON.stringify({ purged }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[purge-deleted-accounts] fatal', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
