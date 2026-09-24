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

## Funzioni SQL SECURITY DEFINER (vivono solo su Supabase, NON in questo repo)
Non esiste ancora un sistema di migrazioni versionate: queste funzioni sono
state create a mano via SQL Editor di Supabase e non compaiono da nessuna
parte nel codice sorgente, solo nelle chiamate `.rpc(...)`. Se in futuro
sembrano "non trovate" (`PGRST202 - Could not find the function`), il
problema è quasi certamente che non sono state (ri)create sul progetto
Supabase che si sta usando, non un bug nel codice TypeScript.

- `avvia_turno(p_targa, p_appalto, p_km_inizio, p_codice_verbale, p_nome_autista, p_note_inizio)`
  — chiamata da `src/app/checkin/page.tsx`. Crea la riga in `turni_presenze`
  e porta il veicolo a `stato = 'in_servizio'` in un'unica transazione,
  bloccando la riga del veicolo (`FOR UPDATE`) e rifiutando l'operazione se
  il veicolo non è realmente `disponibile` in quel momento.
- `chiudi_turno(p_turno_id, p_km_finali)` — chiamata da
  `src/app/checkout/page.tsx`. Chiude il turno (verifica che appartenga
  davvero a chi chiama ed sia `aperto`) e riporta il veicolo a
  `disponibile` con i km aggiornati.
- Su `turni_presenze` esistono 2 RESTRICTIVE policy (`solo_admin_insert_diretto_turni`,
  `solo_admin_update_diretto_turni`) che impediscono a un autista di
  scrivere direttamente sulla tabella (via API, bypassando l'app) — un
  autista *deve* passare da `avvia_turno`/`chiudi_turno`. Un admin non è
  toccato da queste policy.
- **Perché esistono**: prima di queste funzioni, l'update diretto di
  `veicoli.stato`/`km_attuali` da parte di un autista era bloccato in
  modo silenzioso dalla RLS (il check-in sembrava funzionare ma il
  veicolo restava sempre "disponibile"). Un primo tentativo di fix
  (funzioni che si fidavano della sola esistenza di una riga
  `turni_presenze` per autorizzare) si è rivelato exploitabile: un
  autista poteva fabbricare una riga `turni_presenze` per QUALSIASI targa
  (non solo la propria) e usarla per forzare stato/km di un veicolo non
  suo. Le RESTRICTIVE policy + il controllo `FOR UPDATE`/disponibilità
  dentro `avvia_turno` chiudono questo buco.

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
