CREATE TABLE "public"."profiles" (
  "id"                     uuid                     NOT NULL,
  "email"                  text                     NOT NULL,
  "nome"                   text                     NOT NULL,
  "cognome"                text                     NOT NULL,
  "codice_fiscale"         text,
  "telefono"               text,
  "pin_accesso"            character varying(6)     NOT NULL,
  "scadenza_patente"       date,
  "scadenza_visita_medica" date,
  "scadenza_cqc"           date,
  "foto_patente_url"       text,
  "attivo"                 boolean                  DEFAULT true,
  "created_at"             timestamp with time zone DEFAULT now(),
  CONSTRAINT "profiles_codice_fiscale_key" UNIQUE (codice_fiscale),
  CONSTRAINT "profiles_email_key" UNIQUE (email),
  CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles"
  ADD COLUMN "ruolo" public.user_role NOT NULL DEFAULT 'autista_dipendente'::public.user_role;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";
