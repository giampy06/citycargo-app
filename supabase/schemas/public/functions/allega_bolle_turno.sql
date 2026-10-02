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

REVOKE ALL ON FUNCTION public.allega_bolle_turno(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allega_bolle_turno(uuid, text) TO authenticated, service_role;
