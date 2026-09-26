CREATE TABLE public.extra_servizi (
  id          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  created_at  timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  data        date                     NOT NULL,
  descrizione text                     NOT NULL,
  importo     numeric(10,2)            NOT NULL,
  appalto     text                     NOT NULL DEFAULT 'CITI',
  CONSTRAINT extra_servizi_pkey PRIMARY KEY (id),
  CONSTRAINT extra_servizi_appalto_check CHECK (appalto = ANY (ARRAY['CITI'::text, 'EDF'::text, 'RHENUS'::text])),
  CONSTRAINT extra_servizi_importo_check CHECK (importo >= 0)
);

CREATE INDEX extra_servizi_data_idx ON public.extra_servizi (data);

ALTER TABLE public.extra_servizi
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solo admin gestisce gli extra" ON public.extra_servizi
  FOR ALL
  TO PUBLIC
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.extra_servizi TO authenticated;
GRANT ALL ON TABLE public.extra_servizi TO postgres, service_role;
