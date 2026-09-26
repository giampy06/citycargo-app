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
