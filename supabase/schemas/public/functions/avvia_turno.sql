CREATE OR REPLACE FUNCTION public.avvia_turno (
  p_targa          text,
  p_appalto        text,
  p_km_inizio      numeric,
  p_codice_verbale text,
  p_nome_autista   text,
  p_note_inizio    text    DEFAULT NULL::text
)
  RETURNS public.turni_presenze
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_stato_veicolo text;
  v_turno turni_presenze;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autenticato.';
  END IF;

  -- Blocca la riga del veicolo: evita che due check-in concorrenti sullo
  -- stesso mezzo passino entrambi il controllo di disponibilità.
  SELECT stato INTO v_stato_veicolo FROM veicoli WHERE targa = p_targa FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Veicolo % non trovato.', p_targa;
  END IF;

  IF v_stato_veicolo <> 'disponibile' THEN
    RAISE EXCEPTION 'Veicolo % non disponibile (stato attuale: %).', p_targa, v_stato_veicolo;
  END IF;

  IF EXISTS (SELECT 1 FROM turni_presenze WHERE autista_id = auth.uid() AND stato = 'aperto') THEN
    RAISE EXCEPTION 'Hai già un turno aperto.';
  END IF;

  INSERT INTO turni_presenze (
    autista_id, nome_autista, targa_mezzo, appalto, km_inizio,
    codice_verbale, stato, note_inizio
  ) VALUES (
    auth.uid(), p_nome_autista, p_targa, p_appalto, p_km_inizio,
    p_codice_verbale, 'aperto', p_note_inizio
  ) RETURNING * INTO v_turno;

  UPDATE veicoli SET stato = 'in_servizio' WHERE targa = p_targa;

  RETURN v_turno;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."avvia_turno"(text, text, numeric, text, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
