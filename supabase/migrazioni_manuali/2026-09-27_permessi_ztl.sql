-- Permessi ZTL dei furgoni: zona, ente, scadenza, allegato PDF.
-- Da eseguire manualmente nell'SQL Editor di Supabase. Ri-eseguibile senza rischi.
-- Accesso: solo admin (is_admin()). Il ruolo "flotta" verra' aggiunto insieme alla sua migrazione.

-- 1. Tabella -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.permessi_ztl (
  id            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  created_at    timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  veicolo_id    uuid                     NOT NULL,
  zona          text                     NOT NULL,
  ente          text                     NOT NULL,
  data_scadenza date                     NOT NULL,
  allegato_url  text,
  CONSTRAINT permessi_ztl_pkey PRIMARY KEY (id),
  CONSTRAINT permessi_ztl_veicolo_id_fkey FOREIGN KEY (veicolo_id) REFERENCES public.veicoli(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS permessi_ztl_veicolo_id_idx ON public.permessi_ztl (veicolo_id);

ALTER TABLE public.permessi_ztl ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo admin gestisce i permessi ZTL" ON public.permessi_ztl;
CREATE POLICY "Solo admin gestisce i permessi ZTL" ON public.permessi_ztl
  FOR ALL
  TO PUBLIC
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.permessi_ztl TO authenticated;
GRANT ALL ON TABLE public.permessi_ztl TO postgres, service_role;

-- 2. Storage: lettura allegati nel bucket privato fleet-documents ------------
--    Upload e cancellazione per admin esistono gia'. Mancava la lettura per tutti
--    (senza, i link firmati ai PDF non si aprono nemmeno per un admin).

DROP POLICY IF EXISTS "admin_select_fleet_documents" ON storage.objects;
CREATE POLICY "admin_select_fleet_documents" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'fleet-documents' AND public.is_admin());
