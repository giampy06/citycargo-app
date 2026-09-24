CREATE TABLE "public"."autisti" (
  "id"                        uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"                timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "nome"                      text                     NOT NULL,
  "cognome"                   text                     NOT NULL,
  "email"                     text                     NOT NULL,
  "telefono"                  text,
  "codice_fiscale"            text,
  "numero_patente"            text,
  "scadenza_patente"          date,
  "possiede_cqc"              boolean                  DEFAULT false,
  "scadenza_cqc"              date,
  "foto_patente_fronte"       text,
  "foto_patente_retro"        text,
  "foto_codice_fiscale"       text,
  "foto_cqc"                  text,
  "stato"                     text                     NOT NULL DEFAULT 'in_attesa'::text,
  "appalto_default"           text                     DEFAULT 'CITI'::text,
  "approvato_da"              uuid,
  "data_approvazione"         timestamp with time zone,
  "scadenza_visita_medica"    date,
  "scadenza_corso_sicurezza"  date,
  "note_mediche"              text,
  "consenso_privacy"          boolean                  DEFAULT true,
  "data_accettazione_privacy" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "versione_privacy"          text                     DEFAULT 'v1.0-2026'::text,
  CONSTRAINT "autisti_email_key" UNIQUE (email),
  CONSTRAINT "autisti_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."autisti"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autista legge il proprio profilo o admin legge tutti" ON "public"."autisti"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = id) OR public.is_admin()));

CREATE POLICY "Autoregistrazione autista o creazione da admin" ON "public"."autisti"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((auth.uid() = id) OR public.is_admin()));

CREATE POLICY "Solo admin aggiorna autisti" ON "public"."autisti"
  FOR UPDATE
  TO PUBLIC
  USING (public.is_admin());

CREATE POLICY "Solo admin cancella autisti" ON "public"."autisti"
  FOR DELETE
  TO PUBLIC
  USING (public.is_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."autisti" TO "anon", "authenticated", "postgres", "service_role";
