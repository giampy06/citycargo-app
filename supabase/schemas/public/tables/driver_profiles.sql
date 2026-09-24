CREATE TABLE "public"."driver_profiles" (
  "id"               uuid                     NOT NULL,
  "email"            text                     NOT NULL,
  "full_name"        text                     NOT NULL,
  "phone"            text,
  "tax_code"         text,
  "license_number"   text                     NOT NULL,
  "license_expiry"   date                     NOT NULL,
  "license_file_url" text,
  "status"           text                     DEFAULT 'attivo'::text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "driver_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "driver_profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."driver_profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autisti possono inserire/aggiornare il proprio profilo" ON "public"."driver_profiles"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Autisti possono leggere il proprio profilo" ON "public"."driver_profiles"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = id) OR true));

CREATE POLICY "Autisti update profilo" ON "public"."driver_profiles"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = id));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."driver_profiles" TO "anon", "authenticated", "postgres", "service_role";
