-- CORREZIONE di un errore introdotto il 2026-09-28 (2026-09-28_fix_storage_rls_anon.sql)
-- Da eseguire manualmente nell'SQL Editor di Supabase. Ri-eseguibile senza rischi.
--
-- Cosa era successo: per chiudere l'accesso anonimo (SECURITY-AUDIT.md punto 1)
-- sono state CANCELLATE le 3 policy permissive su documenti-veicoli e cedolini.
-- Ma in PostgreSQL le policy RESTRICTIVE possono solo togliere permessi, mai darli:
-- serve sempre almeno una policy PERMISSIVE che conceda l'accesso. Senza quelle 3,
-- documenti-veicoli e cedolini sono rimasti senza alcuna policy di lettura/upload
-- anche per gli utenti loggati (admin compresi).
--
-- Correzione giusta: ripristinare il "permesso base" sul bucket, ma TO authenticated
-- invece di TO PUBLIC. Così:
--   - il ruolo anon (nessun login) resta escluso — il buco del punto 1 resta chiuso;
--   - per gli utenti loggati il comportamento torna identico a prima del 2026-09-28:
--     le policy RESTRICTIVE già esistenti (restringi_*) limitano l'accesso ad admin,
--     propria patente, circolari indirizzate a sé, proprio cedolino (verificato
--     empiricamente con tentativi di IDOR il 2026-09-24).

DROP POLICY IF EXISTS "autenticati_base_documenti_veicoli" ON storage.objects;
CREATE POLICY "autenticati_base_documenti_veicoli" ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'documenti-veicoli')
  WITH CHECK (bucket_id = 'documenti-veicoli');

DROP POLICY IF EXISTS "autenticati_base_lettura_cedolini" ON storage.objects;
CREATE POLICY "autenticati_base_lettura_cedolini" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'cedolini');

DROP POLICY IF EXISTS "autenticati_base_upload_cedolini" ON storage.objects;
CREATE POLICY "autenticati_base_upload_cedolini" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cedolini');

-- Bug pre-esistente, stessa causa: sul bucket vehicle-inspections (foto del check-in)
-- non è mai esistita una policy di LETTURA, quindi il pulsante "Ispeziona Foto" in
-- Presenze non poteva generare i link firmati nemmeno per l'admin. Solo admin: un
-- autista non ha bisogno di rileggere le proprie foto dall'app.
DROP POLICY IF EXISTS "admin_select_vehicle_inspections" ON storage.objects;
CREATE POLICY "admin_select_vehicle_inspections" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'vehicle-inspections' AND public.is_admin());
