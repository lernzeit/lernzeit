-- Nacht-Erfolge entfernen (11.10.2026): keine Belohnung fuer Handynutzung
-- spaet abends oder frueh morgens (Mitternachts-Gelehrter, Nachteule).
--
-- Die App vergibt und zeigt sie seit 11.10.2026 nicht mehr
-- (useAchievementTracker, lib/urkunden.ts). Ueber das Supabase-MCP laesst sich
-- DELETE nicht ausfuehren (wartet auf Bestaetigung, Zeitueberschreitung) –
-- im SQL-Editor des Dashboards von Hand ausfuehren.

delete from public.user_achievements
 where achievement_id in (select id from public.achievements_template
                           where type::text in ('midnight_scholar', 'night_owl'));
delete from public.achievements_template where type::text in ('midnight_scholar', 'night_owl');
