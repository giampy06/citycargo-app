CREATE TABLE "public"."spese_carburante" (
  "id"                       uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "veicolo_id"               uuid                     NOT NULL,
  "mese_competenza"          character varying(7)     NOT NULL,
  "litri_totali"             numeric(10,2)            NOT NULL,
  "spesa_totale_euro"        numeric(10,2)            NOT NULL,
  "km_percorsi_mese"         integer,
  "consumo_medio_kml"        numeric(6,2),
  "file_fattura_origine_url" text,
  "created_at"               timestamp with time zone DEFAULT now(),
  CONSTRAINT "spese_carburante_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."spese_carburante"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."spese_carburante" TO "anon", "authenticated", "postgres", "service_role";
