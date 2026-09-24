CREATE TABLE "public"."buste_paga" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"      timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "autista_nome"    text                     NOT NULL DEFAULT 'Autista City Cargo'::text,
  "mese"            text                     NOT NULL,
  "anno"            integer                  NOT NULL,
  "importo_netto"   numeric,
  "firmato"         boolean                  DEFAULT false,
  "data_firma"      timestamp with time zone,
  "codice_ricevuta" text,
  "file_url"        text                     DEFAULT '#'::text,
  CONSTRAINT "buste_paga_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."buste_paga"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Consenti aggiornamento buste paga" ON "public"."buste_paga"
  FOR UPDATE
  TO PUBLIC
  USING (true);

CREATE POLICY "Consenti inserimento buste paga" ON "public"."buste_paga"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Consenti lettura buste paga" ON "public"."buste_paga"
  FOR SELECT
  TO PUBLIC
  USING (true);

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."buste_paga" TO "anon", "authenticated", "postgres", "service_role";
