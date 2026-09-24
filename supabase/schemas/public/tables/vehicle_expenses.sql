CREATE TABLE "public"."vehicle_expenses" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "targa"       text                     NOT NULL,
  "tipo_spesa"  text                     NOT NULL,
  "importo"     numeric(10,2)            NOT NULL,
  "data_spesa"  date                     NOT NULL DEFAULT CURRENT_DATE,
  "descrizione" text,
  "fattura_url" text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "vehicle_expenses_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."vehicle_expenses"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin gestisce le spese" ON "public"."vehicle_expenses"
  FOR ALL
  TO PUBLIC
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."vehicle_expenses" TO "anon", "authenticated", "postgres", "service_role";
