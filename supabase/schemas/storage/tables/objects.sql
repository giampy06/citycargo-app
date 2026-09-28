-- SECURITY-AUDIT.md punto 1 (CRITICO, corretto il 2026-09-28): le 3 policy
-- permissive "Consenti lettura PDF cedolini", "Consenti upload PDF cedolini" e
-- "Permetti upload pubblico documenti" concedevano accesso TO PUBLIC (quindi
-- anche al ruolo anon, senza alcun login) su cedolini/documenti-veicoli senza
-- nessuna condizione. Le policy RESTRICTIVE sotto sono TO authenticated e non
-- si applicavano al ruolo anon, lasciando quelle 3 come unica regola in vigore
-- per un visitatore non loggato. Rimosse con
-- supabase/migrazioni_manuali/2026-09-28_fix_storage_rls_anon.sql — le policy
-- granulari già esistenti coprono tutti i casi d'uso legittimi.

CREATE POLICY "Storage public access verbali" ON "storage"."objects"
  FOR ALL
  TO PUBLIC
  USING ((bucket_id = 'verbali-furgoni'::text))
  WITH CHECK ((bucket_id = 'verbali-furgoni'::text));

CREATE POLICY "admin_delete_cedolini_bucket" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'cedolini'::text) AND public.is_admin()));

CREATE POLICY "admin_delete_fleet_documents" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'fleet-documents'::text) AND public.is_admin()));

CREATE POLICY "admin_upload_fleet_documents" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'fleet-documents'::text) AND public.is_admin()));

CREATE POLICY "admin_select_fleet_documents" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'fleet-documents'::text) AND public.is_admin()));

CREATE POLICY "autisti_upload_foto_proprio_turno_aperto" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'vehicle-inspections'::text) AND (EXISTS ( SELECT 1
   FROM public.turni_presenze tp
  WHERE (((tp.id)::text = (storage.foldername(objects.name))[2]) AND (tp.autista_id = auth.uid()) AND (tp.stato = 'aperto'::text))))));

CREATE POLICY "restringi_cancellazione_cedolini_bucket" ON "storage"."objects"
  AS RESTRICTIVE
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id <> 'cedolini'::text) OR public.is_admin()));

CREATE POLICY "restringi_cancellazione_documenti_veicoli" ON "storage"."objects"
  AS RESTRICTIVE
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id <> 'documenti-veicoli'::text) OR public.is_admin()));

CREATE POLICY "restringi_lettura_cedolini_bucket" ON "storage"."objects"
  AS RESTRICTIVE
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id <> 'cedolini'::text) OR public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.cedolini c
  WHERE ((c.file_url = objects.name) AND (c.autista_id = auth.uid()))))));

CREATE POLICY "restringi_lettura_documenti_veicoli" ON "storage"."objects"
  AS RESTRICTIVE
  FOR SELECT
  TO "authenticated"
  USING
    (((bucket_id <> 'documenti-veicoli'::text) OR public.is_admin() OR (name ~~ (('patenti/'::text || (auth.uid())::text) || '_%'::text)) OR ((name ~~ 'documenti-firmati/%'::text)
    AND (EXISTS ( SELECT 1
   FROM public.documenti_aziendali da
  WHERE ((da.file_url = objects.name) AND (da.autista_id = (auth.uid())::text)))))));

CREATE POLICY "restringi_modifica_cedolini_bucket" ON "storage"."objects"
  AS RESTRICTIVE
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id <> 'cedolini'::text) OR public.is_admin()));

CREATE POLICY "restringi_modifica_documenti_veicoli" ON "storage"."objects"
  AS RESTRICTIVE
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id <> 'documenti-veicoli'::text) OR public.is_admin()));

CREATE POLICY "restringi_scrittura_cedolini_bucket" ON "storage"."objects"
  AS RESTRICTIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id <> 'cedolini'::text) OR public.is_admin()));

CREATE POLICY "restringi_scrittura_documenti_veicoli" ON "storage"."objects"
  AS RESTRICTIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id <> 'documenti-veicoli'::text) OR public.is_admin() OR (name ~~ (('patenti/'::text || (auth.uid())::text) || '_%'::text))));
