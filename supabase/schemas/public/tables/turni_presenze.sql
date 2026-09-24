CREATE TABLE "public"."turni_presenze" (
  "id"                   uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"           timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "autista_nome"         text                     NOT NULL DEFAULT 'Autista City Cargo'::text,
  "appalto"              text                     NOT NULL,
  "targa_mezzo"          text                     NOT NULL,
  "km_inizio"            numeric                  NOT NULL,
  "km_fine"              numeric,
  "note_inizio"          text,
  "note_fine"            text,
  "tipo_turno"           text                     DEFAULT 'giornata_intera'::text,
  "ha_straordinario"     boolean                  DEFAULT false,
  "note_straordinario"   text,
  "firma_base64"         text,
  "codice_verbale"       text                     NOT NULL,
  "stato"                text                     DEFAULT 'aperto'::text,
  "giro"                 text                     DEFAULT 'Giro Standard'::text,
  "compenso_giornaliero" numeric                  DEFAULT 0,
  "autista_id"           uuid,
  "nome_autista"         text,
  "km_percorsi"          numeric                  DEFAULT 0,
  CONSTRAINT "turni_presenze_appalto_check" CHECK ((appalto = ANY (ARRAY['CITI'::text, 'EDF'::text, 'RHENUS'::text]))),
  CONSTRAINT "turni_presenze_autista_id_fkey" FOREIGN KEY (autista_id) REFERENCES auth.users(id),
  CONSTRAINT "turni_presenze_codice_verbale_key" UNIQUE (codice_verbale),
  CONSTRAINT "turni_presenze_pkey" PRIMARY KEY (id),
  CONSTRAINT "turni_presenze_stato_check" CHECK ((stato = ANY (ARRAY['aperto'::text, 'chiuso'::text, 'attivo'::text, 'completato'::text, 'in_corso'::text])))
);

ALTER TABLE "public"."turni_presenze"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autista chiude i propri turni o admin aggiorna tutti" ON "public"."turni_presenze"
  FOR UPDATE
  TO PUBLIC
  USING (((auth.uid() = autista_id) OR public.is_admin()));

CREATE POLICY "Autista crea solo i propri turni" ON "public"."turni_presenze"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = autista_id));

CREATE POLICY "Autista legge i propri turni o admin legge tutti" ON "public"."turni_presenze"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = autista_id) OR public.is_admin()));

CREATE POLICY "Solo admin cancella turni" ON "public"."turni_presenze"
  FOR DELETE
  TO PUBLIC
  USING (public.is_admin());

CREATE POLICY "solo_admin_insert_diretto_turni" ON "public"."turni_presenze"
  AS RESTRICTIVE
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "solo_admin_update_diretto_turni" ON "public"."turni_presenze"
  AS RESTRICTIVE
  FOR UPDATE
  TO "authenticated"
  WITH CHECK (public.is_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."turni_presenze" TO "anon", "authenticated", "postgres", "service_role";
