CREATE TABLE public.tariffe_giri (
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

CREATE POLICY "Solo admin gestisce le tariffe dei giri" ON public.tariffe_giri
  FOR ALL
  TO PUBLIC
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tariffe_giri TO authenticated;
GRANT ALL ON TABLE public.tariffe_giri TO postgres, service_role;
