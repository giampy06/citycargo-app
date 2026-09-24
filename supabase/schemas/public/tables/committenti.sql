CREATE TABLE "public"."committenti" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "codice"           character varying(20)    NOT NULL,
  "nome_committente" text                     NOT NULL,
  "colore_badge"     character varying(7)     DEFAULT '#E05353'::character varying,
  "attivo"           boolean                  DEFAULT true,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "committenti_codice_key" UNIQUE (codice),
  CONSTRAINT "committenti_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."committenti"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."committenti" TO "anon", "authenticated", "postgres", "service_role";
