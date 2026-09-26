CREATE TABLE "public"."permessi_ztl" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"    timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "veicolo_id"    uuid                     NOT NULL,
  "zona"          text                     NOT NULL,
  "ente"          text                     NOT NULL,
  "data_scadenza" date                     NOT NULL,
  "allegato_url"  text,
  CONSTRAINT "permessi_ztl_pkey" PRIMARY KEY (id),
  CONSTRAINT "permessi_ztl_veicolo_id_fkey" FOREIGN KEY (veicolo_id) REFERENCES public.veicoli(id) ON DELETE CASCADE
);

CREATE INDEX "permessi_ztl_veicolo_id_idx" ON "public"."permessi_ztl" (veicolo_id);

ALTER TABLE "public"."permessi_ztl"
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin gestisce i permessi ZTL" ON "public"."permessi_ztl"
  FOR ALL
  TO PUBLIC
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."permessi_ztl" TO "authenticated";
GRANT ALL ON TABLE "public"."permessi_ztl" TO "postgres", "service_role";
