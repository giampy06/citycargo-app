CREATE TABLE "public"."cedolini" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "autista_email"    text,
  "autista_nome"     text,
  "mese_riferimento" text                     NOT NULL,
  "anno"             integer                  NOT NULL DEFAULT 2026,
  "file_url"         text                     NOT NULL,
  "firmato"          boolean                  DEFAULT false,
  "data_firma"       timestamp with time zone,
  "ip_firma"         text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "autista_id"       uuid,
  "mese"             text,
  "firma_url"        text,
  CONSTRAINT "cedolini_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."cedolini"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autista firma il proprio cedolino o admin aggiorna tutti" ON "public"."cedolini"
  FOR UPDATE
  TO PUBLIC
  USING (((auth.uid() = autista_id) OR public.is_admin()));

CREATE POLICY "Autista legge i propri cedolini o admin legge tutti" ON "public"."cedolini"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = autista_id) OR public.is_admin()));

CREATE POLICY "Solo admin cancella cedolini" ON "public"."cedolini"
  FOR DELETE
  TO PUBLIC
  USING (public.is_admin());

CREATE POLICY "Solo admin carica cedolini" ON "public"."cedolini"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.is_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cedolini" TO "anon", "authenticated", "postgres", "service_role";
