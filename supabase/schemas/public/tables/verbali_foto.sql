CREATE TABLE "public"."verbali_foto" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "turno_id"       uuid,
  "tipo_controllo" text                     NOT NULL,
  "tipo_foto"      text                     NOT NULL,
  "foto_url"       text                     NOT NULL,
  "targa"          text                     NOT NULL,
  "autista_nome"   text,
  "coordinate_gps" text,
  "data_ora"       timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "verbali_foto_pkey" PRIMARY KEY (id),
  CONSTRAINT "verbali_foto_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES public.turni_presenze(id) ON DELETE CASCADE
);

ALTER TABLE "public"."verbali_foto"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autista carica foto solo per i propri turni" ON "public"."verbali_foto"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.turni_presenze t
  WHERE ((t.id = verbali_foto.turno_id) AND (t.autista_id = auth.uid()))))));

CREATE POLICY "Autista legge le foto dei propri turni o admin legge tutte" ON "public"."verbali_foto"
  FOR SELECT
  TO PUBLIC
  USING ((public.is_admin() OR (EXISTS ( SELECT 1
   FROM public.turni_presenze t
  WHERE ((t.id = verbali_foto.turno_id) AND (t.autista_id = auth.uid()))))));

CREATE POLICY "Solo admin cancella verbali_foto" ON "public"."verbali_foto"
  FOR DELETE
  TO PUBLIC
  USING (public.is_admin());

CREATE POLICY "Solo admin modifica verbali_foto" ON "public"."verbali_foto"
  FOR UPDATE
  TO PUBLIC
  USING (public.is_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."verbali_foto" TO "anon", "authenticated", "postgres", "service_role";
