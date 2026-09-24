CREATE TABLE "public"."documenti_aziendali" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"     timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "titolo"         text                     NOT NULL,
  "descrizione"    text,
  "file_url"       text                     NOT NULL,
  "richiede_firma" boolean                  DEFAULT true,
  "firmato"        boolean                  DEFAULT false,
  "data_firma"     timestamp with time zone,
  "firma_url"      text,
  "autista_id"     text,
  CONSTRAINT "documenti_aziendali_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."documenti_aziendali"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autista firma il proprio documento o admin aggiorna tutti" ON "public"."documenti_aziendali"
  FOR UPDATE
  TO PUBLIC
  USING ((((auth.uid())::text = autista_id) OR public.is_admin()));

CREATE POLICY "Autista legge i propri documenti o admin legge tutti" ON "public"."documenti_aziendali"
  FOR SELECT
  TO PUBLIC
  USING ((((auth.uid())::text = autista_id) OR public.is_admin()));

CREATE POLICY "Solo admin cancella documenti" ON "public"."documenti_aziendali"
  FOR DELETE
  TO PUBLIC
  USING (public.is_admin());

CREATE POLICY "Solo admin invia documenti" ON "public"."documenti_aziendali"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.is_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."documenti_aziendali" TO "anon", "authenticated", "postgres", "service_role";
