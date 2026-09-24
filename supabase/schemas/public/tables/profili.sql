CREATE TABLE "public"."profili" (
  "id"         uuid                     NOT NULL,
  "email"      text                     NOT NULL,
  "nome"       text,
  "cognome"    text,
  "ruolo"      text                     NOT NULL DEFAULT 'autista'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "profili_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "profili_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profili"
  ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_blocca_autopromozione_ruolo
  BEFORE UPDATE ON public.profili
  FOR EACH ROW
  EXECUTE FUNCTION public.blocca_autopromozione_ruolo();

CREATE POLICY "Gli utenti possono aggiornare il proprio profilo" ON "public"."profili"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = id));

CREATE POLICY "Solo il proprio profilo admin" ON "public"."profili"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = id));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profili" TO "anon", "authenticated", "postgres", "service_role";
