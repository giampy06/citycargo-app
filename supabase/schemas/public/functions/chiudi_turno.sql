CREATE OR REPLACE FUNCTION public.chiudi_turno (
  p_turno_id  uuid,
  p_km_finali numeric
)
  RETURNS public.turni_presenze
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_turno turni_presenze;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autenticato.';
  END IF;

  SELECT * INTO v_turno FROM turni_presenze
    WHERE id = p_turno_id AND autista_id = auth.uid() AND stato = 'aperto'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nessun turno aperto trovato per questo utente.';
  END IF;

  IF p_km_finali <= v_turno.km_inizio THEN
    RAISE EXCEPTION 'I km finali (%) devono essere superiori a quelli di partenza (%).', p_km_finali, v_turno.km_inizio;
  END IF;

  UPDATE turni_presenze SET
    km_fine = p_km_finali,
    km_percorsi = p_km_finali - km_inizio,
    compenso_giornaliero = 85.00,
    stato = 'chiuso'
  WHERE id = p_turno_id
  RETURNING * INTO v_turno;

  UPDATE veicoli SET km_attuali = p_km_finali, stato = 'disponibile' WHERE targa = v_turno.targa_mezzo;

  RETURN v_turno;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."chiudi_turno"(uuid, numeric) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
