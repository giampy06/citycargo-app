CREATE OR REPLACE FUNCTION public.blocca_autopromozione_ruolo()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF NEW.ruolo IS DISTINCT FROM OLD.ruolo AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Non puoi modificare il tuo ruolo.';
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."blocca_autopromozione_ruolo"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
