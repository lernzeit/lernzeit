# Supabase-Support: cron job 13 entfernen

**Was zu tun ist:** Diesen Text im Supabase-Dashboard unter *Support → New
ticket* einreichen (Projekt `fsmgynpdfxkaiiuguqyr`). Er ist auf Englisch,
weil der Support auf Englisch arbeitet.

**Dringlichkeit: niedrig.** Der Auftrag richtet keinen Schaden an, er
scheitert nur stündlich. Das kann warten, bis ohnehin ein Ticket ansteht.

---

**Subject:** Cannot unschedule a pg_cron job owned by `supabase_read_only_user`

**Body:**

> Project ref: `fsmgynpdfxkaiiuguqyr`
>
> We have a duplicate pg_cron job that I cannot remove. Both jobs are named
> `push-hourly-dispatch`:
>
> - jobid 13 — owner `supabase_read_only_user` — obsolete, fails every hour
> - jobid 20 — owner `postgres` — the current, working job
>
> Job 13 was created before a fix and still sends the anon key as its bearer
> token, so the target Edge Function correctly answers 401. It sends nothing;
> it just fails hourly and fills `net._http_response` with errors.
>
> I cannot remove it from the SQL editor, which runs as `postgres`:
>
> ```
> SELECT cron.unschedule(13);
>   -> ERROR 42501: permission denied for table job
>
> SET ROLE supabase_read_only_user;
>   -> ERROR 42501: permission denied to set role "supabase_read_only_user"
>
> GRANT supabase_read_only_user TO postgres;
>   -> ERROR 42501: "supabase_read_only_user" role memberships are reserved,
>      only superusers can grant them
> ```
>
> Could you please remove jobid 13? Job 20 must stay — it is the working one.
>
> Thanks.

---

## Falls der Support nach dem Grund fragt

Der Auftrag entstand, weil `cron.schedule` mit einem bereits vergebenen Namen
den bestehenden Auftrag **nicht ersetzt**, sondern einen zweiten gleichen
Namens anlegt, wenn er einer anderen Rolle gehört. Das ist in
`supabase/migrations/20260823211801_push_cron_auth.sql` dokumentiert.
