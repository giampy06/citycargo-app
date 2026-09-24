CREATE TABLE "public"."tratte" (
  "id"                          uuid                  NOT NULL DEFAULT gen_random_uuid(),
  "codice_tratta"               character varying(50) NOT NULL,
  "nome_zona"                   text                  NOT NULL,
  "tariffa_dipendente_giornata" numeric(10,2)         NOT NULL DEFAULT 0.00,
  "tariffa_padroncino_giornata" numeric(10,2)         NOT NULL DEFAULT 0.00,
  "attiva"                      boolean               DEFAULT true,
  CONSTRAINT "tratte_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."tratte"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tratte" TO "anon", "authenticated", "postgres", "service_role";
