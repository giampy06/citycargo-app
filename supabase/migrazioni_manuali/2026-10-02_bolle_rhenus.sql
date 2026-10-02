-- Scansione bolle di consegna a fine turno (solo turni RHENUS).
-- Da eseguire manualmente nell'SQL Editor di Supabase. Ri-eseguibile senza rischi.
--
-- Un turno ha al massimo UN PDF con tutte le bolle: basta una colonna con il
-- PERCORSO del file (mai un link pubblico), niente tabella nuova.
-- Il PDF sta nel bucket privato "bolle-consegna", percorso turni/<id-turno>/bolle-<ts>.pdf
-- (stesso schema delle foto del check-in in vehicle-inspections).

-- 1. Colonna -----------------------------------------------------------------

ALTER TABLE public.turni_presenze ADD COLUMN IF NOT EXISTS bolle_pdf_path text;
COMMENT ON COLUMN public.turni_presenze.bolle_pdf_path IS
  'Percorso del PDF delle bolle di consegna nel bucket privato bolle-consegna (solo turni RHENUS).';

-- 2. Bucket privato fin da subito, solo PDF, max 20 MB ------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bolle-consegna', 'bolle-consegna', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Policy storage: tutte TO authenticated (anon escluso), tutte PERMISSIVE
--    con la condizione completa dentro (non serve combinarle con RESTRICTIVE).

-- Upload: solo nella cartella del PROPRIO turno, ancora aperto, RHENUS.
DROP POLICY IF EXISTS "autisti_upload_bolle_proprio_turno" ON storage.objects;
CREATE POLICY "autisti_upload_bolle_proprio_turno" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bolle-consegna'
    AND (storage.foldername(name))[1] = 'turni'
    AND EXISTS (
      SELECT 1 FROM public.turni_presenze tp
      WHERE tp.id::text = (storage.foldername(name))[2]
        AND tp.autista_id = auth.uid()
        AND tp.stato = 'aperto'
        AND tp.appalto = 'RHENUS'
    )
  );

-- Lettura: admin tutto, autista solo le bolle dei propri turni.
DROP POLICY IF EXISTS "lettura_bolle_admin_o_proprio_turno" ON storage.objects;
CREATE POLICY "lettura_bolle_admin_o_proprio_turno" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bolle-consegna'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.turni_presenze tp
        WHERE tp.id::text = (storage.foldername(name))[2]
          AND tp.autista_id = auth.uid()
      )
    )
  );

-- Modifica e cancellazione: solo admin.
DROP POLICY IF EXISTS "admin_modifica_bolle" ON storage.objects;
CREATE POLICY "admin_modifica_bolle" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bolle-consegna' AND public.is_admin());

DROP POLICY IF EXISTS "admin_cancella_bolle" ON storage.objects;
CREATE POLICY "admin_cancella_bolle" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'bolle-consegna' AND public.is_admin());

-- 4. Funzione per collegare il PDF al turno -----------------------------------
--    Un autista non può aggiornare turni_presenze direttamente (policy RESTRICTIVE
--    solo_admin_update_diretto_turni): passa da qui, che accetta solo il proprio
--    turno RHENUS aperto, un percorso dentro la cartella di QUEL turno, e un file
--    che esiste davvero nel bucket.

CREATE OR REPLACE FUNCTION public.allega_bolle_turno(p_turno_id uuid, p_path text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autenticato.';
  END IF;

  IF p_path IS NULL
     OR p_path NOT LIKE 'turni/' || p_turno_id::text || '/%'
     OR p_path LIKE '%..%' THEN
    RAISE EXCEPTION 'Percorso del PDF bolle non valido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'bolle-consegna' AND name = p_path
  ) THEN
    RAISE EXCEPTION 'Il PDF delle bolle non risulta caricato.';
  END IF;

  UPDATE turni_presenze
     SET bolle_pdf_path = p_path
   WHERE id = p_turno_id
     AND autista_id = auth.uid()
     AND stato = 'aperto'
     AND appalto = 'RHENUS';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nessun turno RHENUS aperto trovato per questo utente.';
  END IF;
END;
$function$;

-- Le funzioni nuove sono eseguibili da PUBLIC per default: va tolto esplicitamente.
REVOKE ALL ON FUNCTION public.allega_bolle_turno(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allega_bolle_turno(uuid, text) TO authenticated, service_role;
