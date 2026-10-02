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
- **Revisione sistematica completa effettuata il 2026-09-24**: tutte le 4 API
  routes, le 8 tabelle (`autisti`, `cedolini`, `documenti_aziendali`, `profili`,
  `turni_presenze`, `vehicle_expenses`, `veicoli`, `verbali_foto`), i 4 bucket
  storage (`documenti-veicoli`, `fleet-documents`, `cedolini`,
  `vehicle-inspections`) e le 18 pagine dell'app sono state verificate
  empiricamente (non solo lette nel codice) con tentativi reali di IDOR/
  escalation. `cedolini`, `documenti_aziendali`, `autisti`, `vehicle_expenses`,
  `verbali_foto`, `turni_presenze`, `veicoli` risultano ben protette a livello
  di tabella — un autista non può leggere/scrivere righe di altri autisti,
  falsificare verbali fotografici, spese, o bypassare le funzioni RPC per
  alterare stato/km dei veicoli o i compensi. Tutte le pagine caricano senza
  errori. Prima di questo giro erano state trovate e corrette le falle
  elencate sotto.
- 🔴 **(RISOLTO) Escalation di privilegi su `profili`**: fino al 2026-09-24
  QUALSIASI autista poteva promuoversi ad admin con un semplice
  `PATCH /rest/v1/profili?id=eq.<proprio-id>` impostando `ruolo: 'admin'`
  — nessuna protezione sul campo `ruolo` della propria riga. Era limitato
  alla propria riga (non poteva toccare righe altrui), ma bastava questo
  per ottenere accesso admin completo su tutto il resto del sistema (dato
  che `is_admin()` legge proprio questo campo). Era la falla più grave
  trovata in tutta la revisione. Corretta con un trigger
  (`blocca_autopromozione_ruolo`, BEFORE UPDATE su `profili`) che rifiuta
  qualsiasi cambio del campo `ruolo` da parte di chi non è già admin.
  **Nota**: ogni autista ha comunque una propria riga in `profili` (verificato
  che esiste già per Marco Togni), ma **l'admin non riesce a vederla** nemmeno
  cercandola per id esatto — la SELECT su `profili` sembra ristretta a
  "solo la propria riga" anche per l'account admin (a differenza del resto
  del sistema, dove `is_admin()` dà accesso a tutto). Non è un problema di
  sicurezza (è più restrittivo, non meno), ma è un'inconsistenza rispetto
  al modello generale, da capire se è voluta.
- Bucket Storage **privati** (non pubblici): `documenti-veicoli`, `fleet-documents`,
  `vehicle-inspections`, `cedolini`. Il codice usa `getPrivateFileUrl(bucket, path)`
  in `src/supabase.ts` per generare link firmati temporanei — i campi `_url` nel
  database DOVREBBERO contenere PERCORSI, non link pubblici completi (ma
  esistono almeno 2 righe legacy in `documenti_aziendali` con l'URL pubblico
  completo invece del percorso — bug pre-esistente, non di sicurezza: rende
  quei 2 documenti semplicemente non apribili, non li espone. Da ripulire.).
- RLS attiva su tutte le tabelle principali. Modello: funzione `is_admin()`
  (SQL, SECURITY DEFINER) verifica `profili.ruolo = 'admin'`. Un autista vede/
  modifica solo le proprie righe (via `auth.uid() = autista_id` o `= id`), un
  admin vede/gestisce tutto. Verificato empiricamente (tentativi reali di IDOR)
  che `cedolini`, `documenti_aziendali`, `autisti`, `vehicle_expenses` sono
  ben protette a livello di tabella.
- Bucket `documenti-veicoli` e `cedolini`: protetti da policy RLS **RESTRICTIVE**
  su `storage.objects` (aggiunte durante una security review, vedi sotto) — un
  autista può leggere solo la propria patente (`patenti/<proprio-uuid>_*`), le
  circolari indirizzate a lui (`documenti-firmati/...`, verificato tramite
  `documenti_aziendali.file_url`) e il proprio cedolino; tutto il resto è
  riservato all'admin. Prima di questa fix, qualunque autista autenticato
  poteva leggere/sovrascrivere i documenti di TUTTI gli altri tramite l'API
  REST diretta di Supabase Storage, bypassando gli URL firmati — trovato e
  chiuso il 2026-09-24.
- Endpoint IA (`/api/analyze-expenses`, `/api/parse-dkv`) richiedono un token
  di sessione valido (Authorization: Bearer) **e ora verificano anche che il
  chiamante sia admin** (`supabase.rpc('is_admin')` con il token dell'utente
  nell'header) — prima qualsiasi autista autenticato poteva chiamarli.
  Corretto il 2026-09-24.
- Endpoint cron (`/api/cron/lunedimattina`) protetto da `CRON_SECRET`, ora con
  controllo esplicito `!process.env.CRON_SECRET` (fail-closed se la variabile
  non è impostata, invece di confrontare contro la stringa letterale "Bearer
  undefined"). Corretto il 2026-09-24.
- `/api/crea-autista` ora richiede un token admin valido (stesso pattern
  `is_admin()` via RPC) prima di creare un account autista. Prima non aveva
  ALCUN controllo — chiunque poteva creare account già "attivi" bypassando
  l'approvazione. Corretto il 2026-09-24.
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

## Monitoraggio e CI (dal 2026-09-26)
- **Controllo salute giornaliero**: `/api/cron/controllo-salute` (Vercel Cron,
  `0 6 * * *`, protetto da `CRON_SECRET` come `lunedimattina`). Verifica sito
  online (`/` e `/login` in produzione) e database raggiungibile (count su
  `veicoli`), timeout 8s/5s. Manda **sempre** un messaggio Telegram (anche
  quando tutto è ok), così un silenzio anomalo si nota. Usa l'helper condiviso
  `src/lib/telegram.ts` — non condiviso con `lunedimattina/route.ts` che resta
  intoccato di proposito.
- **Cron `lunedimattina` (corretto il 2026-09-26)**: prima leggeva colonne
  inesistenti (`veicoli.scadenza_*` invece di `data_scadenza_*`) e la tabella
  sbagliata (`profili` invece di `autisti`), e in più girava con la chiave
  pubblica senza login, quindi la RLS gli mostrava 0 righe: riportava sempre
  "tutto ok". Ora usa `SUPABASE_SERVICE_ROLE_KEY` (solo server, variabile
  Vercel, MAI con prefisso NEXT_PUBLIC_) tramite `src/lib/supabaseAdmin.ts`, la
  logica sta in `src/lib/scadenze.ts`, e se non riesce a leggere i dati manda
  un avviso di errore invece di "tutto ok". Controlla veicoli (assicurazione,
  revisione: soglia 15 gg) e autisti attivi (patente, visita medica, corso
  sicurezza, CQC se posseduta: soglia 30 gg), incluse le scadenze già passate.
- **Compensi**: il compenso fisso di 85 € in `chiudi_turno` e la stima 0,15
  €/km nella dashboard autista erano valori inventati (non basati su regole
  reali) e sono stati rimossi. L'unica fonte valida è il foglio "Presenze"
  (PDF di agosto 2026): importo giornaliero per lettera di servizio (P 185,
  E 215, S 255, B 255, N 220, J 235, C 235, L 255, D 215), assegnata la sera
  dal capo in base al servizio svolto. Da implementare.
- **CI GitHub Actions** (`.github/workflows/ci.yml`): ad ogni push su `main`
  esegue `npx tsc --noEmit` e `npm run build`. Richiede i secret repo
  `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (stessi valori
  pubblici già in `.env.local`, non sensibili). Notifica di fallimento: solo
  l'email automatica di GitHub, nessun Telegram dedicato per ora.
- Report settimanale "Suggerimenti" basato su Gemini: **proposto ma non
  implementato** (ha un costo API reale, per quanto minimo, rimandato su
  richiesta esplicita dell'utente).

## Scansione bolle di consegna RHENUS (dal 2026-10-02)
- **Quando**: al check-out, SOLO se `turni_presenze.appalto = 'RHENUS'` (colonna
  `appalto`, text NOT NULL, CHECK `CITI`/`EDF`/`RHENUS`). RHENUS è tornato tra gli
  appalti del check-in: non ha tariffa, quindi il turno parte `da_controllare` con
  importo 0 e l'importo lo inserisce l'admin. La scansione è **facoltativa**: chiudere
  senza bolle chiede conferma.
- **Flusso**: una foto per bolla (`<input capture="environment">`), rilevamento
  automatico dei bordi, poi **sempre** l'editor con i 4 angoli trascinabili (con lente
  d'ingrandimento), raddrizzamento e bianco/nero, elenco pagine con anteprima, elimina
  e rifai. Alla chiusura tutte le pagine diventano UN PDF A4 (jsPDF), caricato **prima**
  di `chiudi_turno`: l'upload richiede un turno ancora aperto.
- **Libreria**: OpenCV.js 5.0 (`@techstark/opencv-js`, versione esatta in
  package.json). `scripts/copia-opencv.mjs` (postinstall) lo copia in
  `public/vendor/opencv-<versione>.js` (ignorato da git ed eslint), servito dal nostro
  dominio con cache immutabile (`next.config.ts`). Pesa ~13 MB (~3,8 MB compressi) e si
  scarica solo nel check-out RHENUS, una volta sola, in background appena si apre la
  pagina. Se in futuro si aggiunge una CSP completa, serve `'wasm-unsafe-eval'` in
  `script-src`.
- **Codice**: `src/lib/scanner/opencv.ts` (caricamento), `elabora.ts` (rilevamento,
  raddrizzamento, bianco/nero), `pdf.ts` (jsPDF); `src/components/scanner/`
  (`BolleScanner`, `EditorAngoli`). Il check-out carica lo scanner con `next/dynamic`.
- **Rilevamento bordi**: 3 strategie (Canny fisso, Canny con soglie dalla mediana,
  Otsu), tiene il quadrilatero convesso plausibile più grande che sia almeno 15 livelli
  più chiaro di ciò che lo circonda. Questo scarta i riquadri stampati dentro la bolla,
  come la tabella. Esiti: `trovato`, `incerto` (1-2 angoli sul bordo della foto, foglio
  tagliato) e `non_trovato` (rettangolo di partenza da sistemare a mano). Tarato su foto
  sintetiche con proiezione da fotocamera reale: va ricontrollato con foto vere.
- **Proporzioni**: metodo di Zhang & He (stima della focale dai 4 angoli). Se la stima
  non è credibile, si ripiega su una focale tipica da telefono (0,6 × diagonale foto).
  Errore mediano ~1% contro ~16% del semplice "misura i lati".
- **Limiti**: ~300 KB per bolla (misurato), max **50 bolle per turno** (≈15 MB, sotto i
  20 MB del bucket) e controllo della dimensione prima dell'upload. Dopo il
  raddrizzamento si taglia lo 0,8% per lato, per togliere il filo di tavolo che
  diventerebbe una riga nera.
- **Bianco/nero**: lo sfondo carta è stimato con dilatazione + mediana e diviso via
  (toglie ombre e luce non uniforme), poi soglia Otsu. Limite noto: le grandi aree scure
  piene (es. un logo bianco su riquadro blu) escono "a contorno".
- **Database**: colonna `turni_presenze.bolle_pdf_path` (solo il PERCORSO). Bucket
  privato `bolle-consegna` (solo PDF, max 20 MB), percorso
  `turni/<id-turno>/bolle-<timestamp>.pdf`. Policy: upload solo nella cartella del
  proprio turno aperto RHENUS; lettura admin o autista del turno; modifica e
  cancellazione solo admin. Tutte `TO authenticated`, tutte permissive con la condizione
  completa.
- **Funzione** `allega_bolle_turno(p_turno_id, p_path)` (SECURITY DEFINER, EXECUTE solo
  `authenticated`): collega il PDF al turno solo se il turno è dell'utente, aperto e
  RHENUS, se il percorso sta nella cartella di quel turno e se il file esiste davvero nel
  bucket. SQL: `supabase/migrazioni_manuali/2026-10-02_bolle_rhenus.sql`.
- **Admin (tutto in Presenze, nessuna sezione separata)**: ogni turno con
  `bolle_pdf_path` ha il pulsante "Bolle", e ogni giornata con bolle ha "Bolle del
  giorno" che scarica un .zip (fflate) con un PDF per turno. Ogni PDF si scarica come
  `NOMEAUTISTA-TARGA-DATA.pdf`, es. `MARCO_TOGNI-GH482KL-02-10-2026.pdf`: maiuscolo,
  senza accenti né spazi, data italiana. Il nome lo imposta il link firmato
  (`download`), mentre il file nello storage resta in `turni/<id>/`. Se lo stesso
  autista fa più turni RHENUS con lo stesso furgone nello stesso giorno si aggiunge
  `-2`, `-3`... Logica in `src/lib/bolle.ts`. Anche l'autista, dal check-out, scarica
  il PDF con lo stesso nome.

## Presenze divise per appalto (dal 2026-10-02)
- Schede Tutti / CITI / EDF / RHENUS (filtro sui turni del mese, con conteggi).
- Il pulsante Excel segue la scheda attiva. `/api/export-foglio-presenze?appalto=`
  accetta `CITI` (default, il foglio originale identico a prima, foglio "Presenze"),
  `EDF`, `RHENUS` o `TUTTI` (un foglio di lavoro per appalto). `costruisciFoglio`
  accetta `appalto` (default CITI): tariffe ed extra di quell'appalto. Senza lettera in
  tariffa, la cella mostra l'iniziale dell'appalto (E, R); RHENUS non ha tariffe, quindi
  l'importo è quello inserito dall'admin e la cella resta rossa finché è "da
  controllare".
- La pagina "Foglio mese" (anteprima e gestione extra) resta solo CITI.

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
