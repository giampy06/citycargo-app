CREATE TABLE "public"."manutenzioni_fatture" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "veicolo_id"         uuid                     NOT NULL,
  "km_rilevati"        integer                  NOT NULL,
  "importo_imponibile" numeric(10,2)            NOT NULL,
  "aliquota_iva"       numeric(4,2)             DEFAULT 0.22,
  "officina"           text,
  "numero_documento"   text,
  "foto_allegato_url"  text,
  "data_documento"     date                     NOT NULL DEFAULT CURRENT_DATE,
  "note"               text,
  "created_at"         timestamp with time zone DEFAULT now(),
  CONSTRAINT "manutenzioni_fatture_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."manutenzioni_fatture"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."manutenzioni_fatture"
  ADD COLUMN "importo_iva" numeric(10,2) GENERATED ALWAYS AS ((importo_imponibile * aliquota_iva)) STORED;

ALTER TABLE "public"."manutenzioni_fatture"
  ADD COLUMN "totale_con_iva" numeric(10,2) GENERATED ALWAYS AS ((importo_imponibile * ((1)::numeric + aliquota_iva))) STORED;

ALTER TABLE "public"."manutenzioni_fatture"
  ADD COLUMN "tipo_intervento" public.maint_type NOT NULL;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."manutenzioni_fatture" TO "anon", "authenticated", "postgres", "service_role";
