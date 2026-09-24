CREATE POLICY "Consenti lettura PDF cedolini" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'cedolini'::text));

CREATE POLICY "Consenti upload PDF cedolini" ON "storage"."objects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((bucket_id = 'cedolini'::text));

CREATE POLICY "Permetti upload pubblico documenti" ON "storage"."objects"
  FOR ALL
  TO PUBLIC
  USING ((bucket_id = 'documenti-veicoli'::text))
  WITH CHECK ((bucket_id = 'documenti-veicoli'::text));

CREATE POLICY "Storage public access verbali" ON "storage"."objects"
  FOR ALL
  TO PUBLIC
  USING ((bucket_id = 'verbali-furgoni'::text))
  WITH CHECK ((bucket_id = 'verbali-furgoni'::text));

CREATE POLICY "admin_upload_fleet_documents" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'fleet-documents'::text) AND public.is_admin()));

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
