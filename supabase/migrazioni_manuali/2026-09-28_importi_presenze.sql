-- Importi maturati per turno (giro scelto al check-in) e tariffe dei giri.
-- Da eseguire manualmente nell'SQL Editor di Supabase. Ri-eseguibile senza rischi.
-- Presuppone gia' eseguito 2026-09-26_rimuovi_compenso_fisso.sql (chiudi_turno senza i 85 EUR fissi).

-- 1. Tariffe dei giri (solo admin) -------------------------------------------

CREATE TABLE IF NOT EXISTS public.tariffe_giri (
  id         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  appalto    text                     NOT NULL DEFAULT 'CITI',
  codice     text,
  nome       text                     NOT NULL,
  importo    numeric(10,2),
  attivo     boolean                  NOT NULL DEFAULT true,
  ordine     integer                  NOT NULL DEFAULT 0,
  CONSTRAINT tariffe_giri_pkey PRIMARY KEY (id),
  CONSTRAINT tariffe_giri_appalto_check CHECK (appalto = ANY (ARRAY['CITI'::text, 'EDF'::text, 'RHENUS'::text])),
  CONSTRAINT tariffe_giri_appalto_nome_key UNIQUE (appalto, nome),
  CONSTRAINT tariffe_giri_importo_check CHECK (importo IS NULL OR importo >= 0)
);
COMMENT ON COLUMN public.tariffe_giri.importo IS 'NULL = importo variabile (es. Extra): lo inserisce un admin a mano.';
COMMENT ON COLUMN public.tariffe_giri.codice IS 'Lettera usata nel foglio Excel delle presenze (P, E, S...).';

ALTER TABLE public.tariffe_giri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo admin gestisce le tariffe dei giri" ON public.tariffe_giri;
CREATE POLICY "Solo admin gestisce le tariffe dei giri" ON public.tariffe_giri
  FOR ALL
  TO PUBLIC
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tariffe_giri TO authenticated;
GRANT ALL ON TABLE public.tariffe_giri TO postgres, service_role;

-- Dati iniziali dal foglio Presenze di agosto 2026 (modificabili dalla pagina Tariffe)
INSERT INTO public.tariffe_giri (appalto, codice, nome, importo, ordine) VALUES
  ('CITI', 'P', 'Presenza',      185, 1),
  ('CITI', 'E', 'BG alto',       215, 2),
  ('CITI', 'S', 'Sponda',        255, 3),
  ('CITI', 'B', 'Brescia',       255, 4),
  ('CITI', 'N', 'Navetta',       220, 5),
  ('CITI', 'J', 'Juan',          235, 6),
  ('CITI', 'C', 'Casalmaggiore', 235, 7),
  ('CITI', 'L', 'Libraccio',     255, 8),
  ('CITI', 'D', 'Dongo',         215, 9),
  ('CITI', NULL, 'Extra',        NULL, 10),
  ('EDF',  NULL, 'EDF - tariffa fissa', 240, 1)
ON CONFLICT (appalto, nome) DO NOTHING;

-- 2. Turni: flag "da controllare" ---------------------------------------------

ALTER TABLE public.turni_presenze ADD COLUMN IF NOT EXISTS da_controllare boolean NOT NULL DEFAULT false;

-- 3. Elenco giri per l'autista: SOLO i nomi, mai gli importi -------------------

CREATE OR REPLACE FUNCTION public.elenco_giri(p_appalto text)
  RETURNS TABLE (nome text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT t.nome
  FROM public.tariffe_giri t
  WHERE t.appalto = p_appalto AND t.attivo AND auth.uid() IS NOT NULL
  ORDER BY t.ordine, t.nome;
$function$;

REVOKE ALL ON FUNCTION public.elenco_giri(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.elenco_giri(text) TO authenticated, service_role, postgres;

-- 4. avvia_turno: giro e importo decisi dal SERVER, mai dal client -------------
--    L'autista passa solo il NOME del giro; l'importo viene letto da tariffe_giri.

DROP FUNCTION IF EXISTS public.avvia_turno(text, text, numeric, text, text, text);

CREATE OR REPLACE FUNCTION public.avvia_turno (
  p_targa          text,
  p_appalto        text,
  p_km_inizio      numeric,
  p_codice_verbale text,
  p_nome_autista   text,
  p_note_inizio    text DEFAULT NULL::text,
  p_giro           text DEFAULT NULL::text
)
  RETURNS public.turni_presenze
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_stato_veicolo  text;
  v_turno          turni_presenze;
  v_tariffa        tariffe_giri;
  v_giro           text    := 'Giro Standard';
  v_importo        numeric := 0;
  v_da_controllare boolean := false;
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

  -- Giro e importo dalla tabella tariffe.
  IF p_appalto = 'EDF' THEN
    SELECT * INTO v_tariffa FROM tariffe_giri
      WHERE appalto = 'EDF' AND attivo ORDER BY ordine, nome LIMIT 1;
    IF FOUND THEN
      v_giro := v_tariffa.nome;
      v_importo := COALESCE(v_tariffa.importo, 0);
      v_da_controllare := v_tariffa.importo IS NULL;
    ELSE
      v_da_controllare := true;
    END IF;
  ELSIF p_appalto = 'CITI' AND p_giro IS NOT NULL THEN
    SELECT * INTO v_tariffa FROM tariffe_giri
      WHERE appalto = 'CITI' AND nome = p_giro AND attivo;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Giro "%" non valido.', p_giro;
    END IF;
    v_giro := v_tariffa.nome;
    v_importo := COALESCE(v_tariffa.importo, 0);
    v_da_controllare := v_tariffa.importo IS NULL;
  ELSE
    -- Appalto senza tariffa o giro non indicato: l'importo lo inserisce un admin.
    v_da_controllare := true;
  END IF;

  INSERT INTO turni_presenze (
    autista_id, nome_autista, targa_mezzo, appalto, km_inizio,
    codice_verbale, stato, note_inizio, giro, compenso_giornaliero, da_controllare
  ) VALUES (
    auth.uid(), p_nome_autista, p_targa, p_appalto, p_km_inizio,
    p_codice_verbale, 'aperto', p_note_inizio, v_giro, v_importo, v_da_controllare
  ) RETURNING * INTO v_turno;

  UPDATE veicoli SET stato = 'in_servizio' WHERE targa = p_targa;

  RETURN v_turno;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."avvia_turno"(text, text, numeric, text, text, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
