-- Signal Mine — automatic daily scans via pg_cron + pg_net (best-effort).
--
-- Calls the deployed edge functions on a schedule so feature candidates and
-- durable themes accumulate WITHOUT anyone clicking "Run scan". Uses the
-- PUBLIC publishable (anon) key — the same key shipped to every browser; RLS
-- and the functions' own service-role context do the privileged work, so this
-- is safe to commit. The whole thing is wrapped so a missing extension or
-- permission simply no-ops (the manual Run scan button always still works).
--
-- Schedule: collect 13:00 UTC, process 13:15 UTC, daily. Change/disable via
-- cron.unschedule('signal-collect-daily') / ('signal-process-daily').

do $$
declare
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ29haHN4a3Jrem9xdXZudGVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTk4MTUsImV4cCI6MjA4ODc3NTgxNX0.UKGLnqSE0OaYrGKekZtYjhamOfvnVhkATk5dwla8j0k';
  base text := 'https://ulgoahsxkrkzoquvntei.supabase.co/functions/v1';
  hdr  jsonb;
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;

  hdr := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer '||anon,
    'apikey', anon
  );

  if exists (select 1 from cron.job where jobname = 'signal-collect-daily') then
    perform cron.unschedule('signal-collect-daily');
  end if;
  if exists (select 1 from cron.job where jobname = 'signal-process-daily') then
    perform cron.unschedule('signal-process-daily');
  end if;

  perform cron.schedule('signal-collect-daily', '0 13 * * *', format($q$
    select net.http_post(url => '%s/signal-collect', headers => %L::jsonb,
                         body => '{"product":"niceace","persist":true}'::jsonb);
  $q$, base, hdr));

  perform cron.schedule('signal-process-daily', '15 13 * * *', format($q$
    select net.http_post(url => '%s/signal-process', headers => %L::jsonb,
                         body => '{"product":"niceace","persist":true}'::jsonb);
  $q$, base, hdr));

  raise notice 'Signal Mine daily cron scheduled (collect 13:00 / process 13:15 UTC).';
exception when others then
  raise notice 'Signal Mine cron not scheduled (manual Run scan still works): %', sqlerrm;
end $$;
