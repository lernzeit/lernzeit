-- Der jaehrliche Klassenwechsel hatte keinen Schutz gegen doppelte
-- Ausfuehrung: annual-grade-upgrade erhoeht bei JEDEM Aufruf jede Klasse um
-- eins. Ein zweiter Aufruf — ein Wiederholungsversuch, ein Klick zu viel, ein
-- manuelles Nachholen neben dem cron-Auftrag — setzt jedes Kind zwei Stufen
-- hoch. Bemerkt wuerde das erst an zu schweren Aufgaben, und dann waere die
-- Ursache nicht mehr zu erkennen.
--
-- Das faellt gerade jetzt ins Gewicht: Der Lauf vom 01.08.2026 ist
-- ausgefallen (der Auftrag schickte damals noch den anon-Schluessel und lief
-- in 401). Wer ihn nachholt, ruft die Funktion zwangslaeufig von Hand auf —
-- genau die Situation, in der ein zweiter Aufruf passiert.
create table if not exists public.annual_job_runs (
  job_name      text primary key,
  last_run_year integer not null,
  last_run_at   timestamptz not null default now(),
  note          text
);

comment on table public.annual_job_runs is
  'Merkposten fuer Auftraege, die hoechstens einmal im Jahr laufen duerfen. Siehe claim_annual_job().';

alter table public.annual_job_runs enable row level security;
-- Kein Zugriff fuer anon/authenticated. Geschrieben wird ausschliesslich ueber
-- claim_annual_job (SECURITY DEFINER), gelesen mit dem Service-Role-Key.

-- Belegt das laufende Jahr fuer diesen Auftrag und meldet, ob der Aufrufer
-- der erste ist.
--
-- Der Kniff steckt im WHERE des ON CONFLICT: Der Eintrag wird nur
-- ueberschrieben, wenn das gespeicherte Jahr aelter ist. Zwei gleichzeitige
-- Aufrufe koennen sich deshalb nicht gegenseitig ueberholen — Postgres
-- serialisiert sie an der Zeile, und der zweite findet sein eigenes Jahr
-- bereits vor. Ohne das waere zwischen "nachsehen" und "eintragen" eine
-- Luecke, und genau in der passieren Doppellaeufe.
create or replace function public.claim_annual_job(p_job_name text, p_year integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_belegt boolean;
begin
  insert into public.annual_job_runs (job_name, last_run_year)
  values (p_job_name, p_year)
  on conflict (job_name) do update
    set last_run_year = excluded.last_run_year,
        last_run_at   = now()
  where public.annual_job_runs.last_run_year < excluded.last_run_year
  returning true into v_belegt;

  return coalesce(v_belegt, false);
end;
$$;

revoke all on function public.claim_annual_job(text, integer) from public;

-- Der Lauf 2026 ist nachweislich ausgefallen: Die Profile-Tabelle hat einen
-- updated_at-Trigger, und am 01.08.2026 wurde genau eine Zeile angefasst
-- statt der damals rund 46 Kinderprofile. Der Merkposten wird deshalb NICHT
-- auf 2026 vorbelegt — sonst waere das Nachholen gesperrt, bevor es
-- entschieden ist.
insert into public.annual_job_runs (job_name, last_run_year, note)
values ('annual-grade-upgrade', 2025,
        'Lauf 2026 ist ausgefallen (cron schickte den anon-Schluessel, 401). Nachholen offen.')
on conflict (job_name) do nothing;

-- Nachtrag 15.09.2026: Entschieden, den ausgefallenen Lauf NICHT nachzuholen.
-- 46 Kinderprofile stammten von vor dem 01.08.2026 und stuenden eine Stufe zu
-- niedrig, 20 wurden seither angelegt und sind richtig; ein pauschaler Lauf
-- ueber alle waere heute falsch gewesen. Eltern korrigieren die Klassenstufe
-- selbst in den Kind-Einstellungen.
--
-- Der Merkposten bleibt deshalb auf 2025 stehen. Das ist Absicht: Der
-- regulaere Lauf am 01.08.2027 findet ein aelteres Jahr vor und laeuft
-- normal.
update public.annual_job_runs
   set note = 'Lauf 2026 ist ausgefallen (cron schickte den anon-Schluessel, 401). '
              'Entscheidung vom 15.09.2026: NICHT nachgeholt, Eltern korrigieren die '
              'Klassenstufe selbst. Der Lauf 2027 am 01.08. ist davon unberuehrt.'
 where job_name = 'annual-grade-upgrade';
