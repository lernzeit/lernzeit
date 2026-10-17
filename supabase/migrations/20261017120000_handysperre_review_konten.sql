-- Handysperre auch für die App-Review-Kinder (17.10.2026, Apple 2.5.19):
-- Die Family-Controls-Berechtigung steckt im iOS-Build; App Review muss die
-- Funktion sehen können. Die Review-Eltern (apple.review.parent@lernzeit.app)
-- sehen die Sperre ihrer Kinder automatisch mit (Policy auf der Tabelle).
insert into public.handysperre_freigaben (child_id, notiz)
select id, 'App-Review-Konto, 17.10.2026' from auth.users
where email in ('applereviewkind@lernzeit.internal', 'applereviewkind2@lernzeit.internal')
on conflict (child_id) do nothing;
