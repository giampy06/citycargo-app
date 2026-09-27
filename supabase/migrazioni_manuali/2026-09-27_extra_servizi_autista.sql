-- Aggiunge l'autista (facoltativo) alle voci EXTRA manuali del foglio presenze.
-- Facoltativo perche' alcuni extra sono generici (es. "Facchinaggio Centrale"), non di una persona.
-- Da eseguire manualmente nell'SQL Editor di Supabase. Ri-eseguibile senza rischi.

ALTER TABLE public.extra_servizi
  ADD COLUMN IF NOT EXISTS autista_id uuid REFERENCES public.autisti(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS extra_servizi_autista_id_idx ON public.extra_servizi (autista_id);
