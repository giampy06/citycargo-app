CREATE TABLE "public"."veicoli" (
  "id"                          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"                  timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "targa"                       text                     NOT NULL,
  "modello"                     text                     NOT NULL,
  "appalto_default"             text,
  "km_attuali"                  numeric                  NOT NULL DEFAULT 0,
  "data_scadenza_assicurazione" date                     NOT NULL,
  "data_scadenza_revisione"     date                     NOT NULL,
  "km_prossimo_tagliando"       numeric                  NOT NULL,
  "stato"                       text                     DEFAULT 'disponibile'::text,
  "libretto_url"                text,
  "assicurazione_url"           text,
  "foto_libretto"               text,
  "foto_assicurazione"          text,
  "foto_revisione"              text,
  "note"                        text,
  CONSTRAINT "veicoli_appalto_default_check" CHECK ((appalto_default = ANY (ARRAY['CITI'::text, 'EDF'::text, 'RHENUS'::text]))),
  CONSTRAINT "veicoli_pkey" PRIMARY KEY (id),
  CONSTRAINT "veicoli_stato_check" CHECK ((stato = ANY (ARRAY['disponibile'::text, 'in_servizio'::text, 'manutenzione'::text]))),
  CONSTRAINT "veicoli_targa_key" UNIQUE (targa)
);

ALTER TABLE "public"."veicoli"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin aggiorna veicoli" ON "public"."veicoli"
  FOR UPDATE
  TO PUBLIC
  USING (public.is_admin());

CREATE POLICY "Solo admin cancella veicoli" ON "public"."veicoli"
  FOR DELETE
  TO PUBLIC
  USING (public.is_admin());

CREATE POLICY "Solo admin inserisce veicoli" ON "public"."veicoli"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.is_admin());

CREATE POLICY "Utenti collegati leggono i veicoli" ON "public"."veicoli"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."veicoli" TO "anon", "authenticated", "postgres", "service_role";
