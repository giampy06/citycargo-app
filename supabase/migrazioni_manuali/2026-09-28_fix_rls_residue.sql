-- SECURITY FIX (SECURITY-AUDIT.md, punti 3 e 5)
-- Da eseguire manualmente nell'SQL Editor di Supabase. Ri-eseguibile senza rischi.

-- ============================================================================
-- Punto 3 — bucket "verbali-furgoni": stessa falla del punto 1 (policy
-- permissiva TO PUBLIC senza condizione), ma su un bucket morto (non
-- referenziato da nessun codice attuale, verificato vuoto). Il bucket viene
-- reso privato separatamente via Storage API; qui rimuoviamo solo la policy.
-- ============================================================================

DROP POLICY IF EXISTS "Storage public access verbali" ON storage.objects;

-- ============================================================================
-- Punto 5 — le funzioni SECURITY DEFINER sotto controllano già
-- "auth.uid() IS NULL" internamente, quindi la concessione a anon era
-- innocua nella pratica; la togliamo comunque per ridurre la superficie
-- esposta a chi non è mai passato da un login, coerente col resto del sistema.
-- Nota: is_admin() resta utilizzabile dalle policy RLS come SECURITY DEFINER
-- anche dopo il REVOKE da anon — l'uso interno del motore RLS non passa dai
-- GRANT di un ruolo di sessione.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.avvia_turno(text, text, numeric, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.chiudi_turno(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.blocca_autopromozione_ruolo() FROM PUBLIC, anon;
