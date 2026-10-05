-- Sicherheitspruefung Release 2.0 (05.10.2026): Eltern-Kind-Verknuepfungen
-- entstehen nur noch ueber den Einladungscode (claim_invitation_code,
-- SECURITY DEFINER) oder Edge Functions mit Service-Rolle.
--
-- Vorher durfte ein angemeldetes Kind eine Zeile mit beliebiger parent_id
-- anlegen und Eltern ("ALL" ohne eigene WITH-CHECK-Bedingung) eine mit
-- beliebiger child_id – wer die ID eines Kindes kannte, haette dessen
-- Lerndaten lesen koennen. Die App selbst legt hier nie Zeilen an.
--
-- ALTER statt DROP/CREATE: Eltern lesen und loeschen weiter ueber
-- "Parents can manage relationships" (USING), neue oder geaenderte Zeilen
-- scheitern an WITH CHECK (false).
alter policy "Children can create their own relationships" on public.parent_child_relationships with check (false);
alter policy "Parents can manage relationships" on public.parent_child_relationships using (auth.uid() = parent_id) with check (false);
