-- Klecksi an oder aus (11.10.2026): Aeltere Kinder finden das Maskottchen
-- irgendwann zu kindlich. null = automatisch (bis Klasse 6 an, ab Klasse 7
-- aus), sonst die Wahl des Kindes. Regel in src/lib/klecksiModus.ts.
-- Das Kind aendert es selbst ueber sein Profil (bestehende Policies).
alter table public.profiles
  add column if not exists klecksi text check (klecksi in ('an', 'aus'));
