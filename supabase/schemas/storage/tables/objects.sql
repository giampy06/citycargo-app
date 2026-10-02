-- SECURITY-AUDIT.md punto 1 (CRITICO, corretto il 2026-09-28): le 3 policy
-- permissive "Consenti lettura PDF cedolini", "Consenti upload PDF cedolini" e
-- "Permetti upload pubblico documenti" concedevano accesso TO PUBLIC (quindi
-- anche al ruolo anon, senza alcun login) su cedolini/documenti-veicoli senza
-- nessuna condizione. Le policy RESTRICTIVE sotto sono TO authenticated e non
-- si applicavano al ruolo anon, lasciando quelle 3 come unica regola in vigore
-- per un visitatore non loggato. Rimosse con
-- supabase/migrazioni_manuali/2026-09-28_fix_storage_rls_anon.sql — le policy
-- granulari già esistenti coprono tutti i casi d'uso legittimi.
--
-- ERRORE in quella correzione (rimediato il 2026-10-02): le policy RESTRICTIVE
-- possono solo togliere permessi, non darli. Senza le 3 permissive, cedolini e
-- documenti-veicoli erano rimasti inaccessibili anche agli utenti loggati. Il
-- "permesso base" è stato ripristinato TO authenticated (non più TO PUBLIC):
-- anon resta escluso, gli utenti loggati sono limitati dalle restringi_* sotto.
-- Vedi supabase/migrazioni_manuali/2026-10-02_ripristina_accesso_storage_autenticati.sql
--
-- "Storage public access verbali" (bucket morto verbali-furgoni) rimossa il
-- 2026-09-28 con supabase/migrazioni_manuali/2026-09-28_fix_rls_residue.sql.

CREATE POLICY "autenticati_base_documenti_veicoli" ON "storage"."objects"
  FOR ALL
  TO "authenticated"
  USING ((bucket_id = 'documenti-veicoli'::text))
  WITH CHECK ((bucket_id = 'documenti-veicoli'::text));

CREATE POLICY "autenticati_base_lettura_cedolini" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING ((bucket_id = 'cedolini'::text));

CREATE POLICY "autenticati_base_upload_cedolini" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'cedolini'::text));

CREATE POLICY "admin_select_vehicle_inspections" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'vehicle-inspections'::text) AND public.is_admin()));

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

-- Bucket privato bolle-consegna (scansione bolle RHENUS, 2026-10-02):
-- supabase/migrazioni_manuali/2026-10-02_bolle_rhenus.sql
CREATE POLICY "autisti_upload_bolle_proprio_turno" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'bolle-consegna'::text) AND ((storage.foldername(name))[1] = 'turni'::text) AND (EXISTS ( SELECT 1
   FROM public.turni_presenze tp
  WHERE (((tp.id)::text = (storage.foldername(objects.name))[2]) AND (tp.autista_id = auth.uid()) AND (tp.stato = 'aperto'::text) AND (tp.appalto = 'RHENUS'::text))))));

CREATE POLICY "lettura_bolle_admin_o_proprio_turno" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'bolle-consegna'::text) AND (public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.turni_presenze tp
  WHERE (((tp.id)::text = (storage.foldername(objects.name))[2]) AND (tp.autista_id = auth.uid())))))));

CREATE POLICY "admin_modifica_bolle" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'bolle-consegna'::text) AND public.is_admin()));

CREATE POLICY "admin_cancella_bolle" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'bolle-consegna'::text) AND public.is_admin()));
