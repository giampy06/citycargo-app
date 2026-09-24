# City Cargo — Note di contesto per Claude Code

Leggimi PRIMA di iniziare a lavorare su questo progetto. Contiene cose scoperte
a fatica durante lo sviluppo, che altrimenti richiederebbero ore per essere
riscoperte una ad una.

## Stack
- Next.js (App Router) + Tailwind, TypeScript
- Supabase (Postgres + Auth + Storage), hosting Vercel
- Repo GitHub: giampy06/citycargo-app (branch main)

## ⚠️ Trappole note sui nomi di colonna (schema reale ≠ nomi "intuitivi")
La tabella `veicoli` ha nomi diversi da quello che ci si aspetterebbe:
- `appalto_default` (NON `appalto_assegnato`)
- `data_scadenza_assicurazione` (NON `scadenza_assicurazione`)
- `data_scadenza_revisione` (NON `scadenza_revisione`)
- `km_prossimo_tagliando` è NOT NULL — va sempre passato un valore all'insert
- `stato` ha un CHECK constraint: accetta SOLO `disponibile`, `in_servizio`, `manutenzione` (niente `in_uso`, `in_manutenzione`, `fermo` — non esistono)

La tabella `documenti_aziendali.autista_id` è di tipo **text**, mentre tutte le
altre tabelle (cedolini.autista_id, turni_presenze.autista_id, autisti.id) sono
**uuid**. Nei confronti con `auth.uid()` serve il cast: `auth.uid()::text`.

**Prima di scrivere qualsiasi query o migrazione**, verifica sempre lo schema
reale con:
```sql
SELECT table_name, column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;
```
Se hai un modo per collegarti a Supabase via CLI/MCP, usalo per leggere lo
schema direttamente invece di indovinare i nomi delle colonne dal codice.

## Tabelle morte/duplicate (non toccare, non usate dal codice attuale)
`driver_profiles`, `profiles` (con la S, diversa da `profili`), `buste_paga`,
`committenti`, `manutenzioni_fatture`, `spese_carburante`. Residui di
un'iterazione precedente del progetto. Da valutare se eliminarle in futuro,
ma non urgente.

## Sicurezza — stato attuale (già sistemato)
- Bucket Storage **privati** (non pubblici): `documenti-veicoli`, `fleet-documents`,
  `vehicle-inspections`, `cedolini`. Il codice usa `getPrivateFileUrl(bucket, path)`
  in `src/supabase.ts` per generare link firmati temporanei — i campi `_url` nel
  database contengono PERCORSI, non link pubblici completi.
- RLS attiva su tutte le tabelle principali. Modello: funzione `is_admin()`
  (SQL, SECURITY DEFINER) verifica `profili.ruolo = 'admin'`. Un autista vede/
  modifica solo le proprie righe (via `auth.uid() = autista_id` o `= id`), un
  admin vede/gestisce tutto.
- Endpoint IA (`/api/analyze-expenses`, `/api/parse-dkv`) richiedono un token
  di sessione valido (Authorization: Bearer) — non sono pubblici.
- Endpoint cron (`/api/cron/lunedimattina`) protetto da `CRON_SECRET`.
- Variabili sensibili (TELEGRAM_BOT_TOKEN, GEMINI_API_KEY) sono in variabili
  d'ambiente su Vercel, non nel codice.

## Da fare / da tenere d'occhio
- Esiste un secondo progetto Vercel duplicato "citycargo-flotta" collegato
  allo stesso repo — è inutilizzato, dà sempre errore di build, andrebbe
  cancellato per pulizia (Vercel → progetto → Settings → Delete Project).
- Quando aggiungi un campo nuovo a una form che scrive su Supabase, controlla
  SEMPRE che la colonna esista con il nome esatto prima di assumerlo dal
  codice esistente — è la causa più comune di bug in questo progetto.
- Prima di dire che qualcosa "funziona", verifica con `npx tsc --noEmit` e,
  se possibile, `npm run build` locale.

## Flusso di lavoro consigliato
1. Un compito alla volta, chiaro e specifico.
2. Fai controllare lo schema reale prima di scrivere query/migrazioni.
3. Fai girare `npx tsc --noEmit` dopo ogni modifica prima di considerarla fatta.
4. Rivedi il `git diff` prima di autorizzare un commit/push.
5. Testa in locale (`npm run dev`) quando possibile prima di andare in produzione.
