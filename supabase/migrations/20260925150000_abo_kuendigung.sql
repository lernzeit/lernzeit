-- Vorgemerkte Kuendigung eines Stripe-Abos.
--
-- Wer im Stripe-Kundenportal kuendigt, kuendigt zum Laufzeitende. Bis dahin
-- meldet Stripe den Status weiter als `active` — ohne diese Spalte ist eine
-- gekuendigte Mitgliedschaft in der Datenbank nicht von einer laufenden zu
-- unterscheiden. Gesetzt von check-subscription (_shared/stripe-abo.ts).
--
-- NULL = nicht gekuendigt. Sonst der letzte Tag mit Premium.
alter table public.subscriptions
  add column if not exists cancel_at timestamptz;

comment on column public.subscriptions.cancel_at is
  'Stripe: Abo ist gekuendigt und endet zu diesem Zeitpunkt; Status bleibt bis dahin active. NULL = nicht gekuendigt.';
