-- SECURITY FIX (SECURITY-AUDIT.md, punto 1 — CRITICO)
-- Da eseguire manualmente nell'SQL Editor di Supabase. Ri-eseguibile senza rischi (DROP IF EXISTS).
--
-- Problema: 3 policy RLS "permissive" residue di un'iterazione precedente del progetto
-- concedevano accesso TO PUBLIC (quindi anche al ruolo anon, NESSUN login) senza alcuna
-- condizione su documenti-veicoli e cedolini. Le policy RESTRICTIVE aggiunte in seguito
-- per limitare l'accesso ("restringi_lettura_documenti_veicoli", ecc.) sono scritte
-- TO authenticated e quindi NON si applicano al ruolo anon, lasciando la vecchia regola
-- permissiva come unica in vigore per un visitatore non loggato.
--
-- Verificato empiricamente il 2026-09-28: con la sola NEXT_PUBLIC_SUPABASE_ANON_KEY
-- (nessun login) era possibile elencare E scaricare le foto patente e i cedolini di
-- qualsiasi autista, bypassando completamente i link firmati.
--
-- Le policy granulari già esistenti (restringi_lettura_documenti_veicoli,
-- restringi_scrittura_documenti_veicoli, restringi_modifica_documenti_veicoli,
-- restringi_cancellazione_documenti_veicoli, restringi_lettura_cedolini_bucket,
-- restringi_scrittura_cedolini_bucket, restringi_modifica_cedolini_bucket,
-- restringi_cancellazione_cedolini_bucket, admin_upload_fleet_documents, ecc.)
-- coprono già tutti i casi d'uso legittimi (proprio file, admin, documento firmato
-- indirizzato a te) — queste 3 policy permissive sono semplicemente superate e vanno
-- rimosse, non sostituite.

DROP POLICY IF EXISTS "Permetti upload pubblico documenti" ON storage.objects;
DROP POLICY IF EXISTS "Consenti lettura PDF cedolini" ON storage.objects;
DROP POLICY IF EXISTS "Consenti upload PDF cedolini" ON storage.objects;
