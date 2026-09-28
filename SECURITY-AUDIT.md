# Security Audit — City Cargo App

**Data**: 2026-09-28
**Metodo**: analisi statica del codice sorgente, `git log -p` sull'intera storia, `npm audit`, lettura delle policy RLS reali (schema SQL versionato in `supabase/schemas/`), **verifica empirica dal vivo** contro il progetto Supabase di produzione usando solo la chiave pubblica (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, quella già presente in ogni bundle JS servito ai visitatori) — nessuna modifica ai dati, solo letture/list.
**Scope**: solo problemi di sicurezza con impatto reale, ragionati dal punto di vista di un attaccante. Nessun file di codice è stato modificato in questa fase.

---

## Sommario esecutivo

| # | Problema | Gravità |
|---|---|---|
| 1 | Patenti e buste paga di **tutti** gli autisti scaricabili da chiunque, **senza login**, tramite la sola chiave pubblica | 🔴 CRITICO |
| 2 | Token del bot Telegram committato in chiaro nella storia di un repository **pubblico** | 🔴 CRITICO |
| 3 | 3 bucket storage legacy impostati `public: true` (oggi vuoti, ma pronti a esporre qualsiasi file ci finisca) | 🟠 IMPORTANTE |
| 4 | Nessun header di sicurezza (CSP, X-Frame-Options) — rischio clickjacking sul pannello admin | 🟠 IMPORTANTE |
| 5 | Funzioni RPC critiche eseguibili anche dal ruolo `anon` (innocuo oggi, superficie inutile) | 🟠 IMPORTANTE |
| 6 | File `src/lib/supabase.ts` morto, con chiave pubblica hardcoded invece che da env | 🟡 MINORE |
| 7 | 1 vulnerabilità *moderate* in `uuid` (via `exceljs`), non risulta sfruttabile con i nostri input | 🟡 MINORE |
| 8 | Foto patenti: valutazione rischio residuo — vedi sezione dedicata | 📋 Raccomandazione |

Il punto 1 è, con largo margine, il problema più grave: è l'unico che ho potuto **dimostrare concretamente** (non solo dedurre dal codice) con una chiamata HTTP reale, senza aver mai effettuato login.

---

## 1. CRITICO — Storage: patenti e cedolini scaricabili senza login

### Come ragiona un attaccante
"Se volessi rubare le patenti o le buste paga degli autisti, andrei prima a cercare se lo storage dei file è davvero protetto quanto sembra dal codice, o se esiste una scorciatoia che bypassa i link firmati." La risposta, verificata dal vivo, è che la scorciatoia esiste già.

### Cosa ho verificato (comandi reali, solo lettura, nessuna scrittura)

Con **solo** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la chiave pubblica presente in chiaro in ogni pagina servita, uguale per chiunque visiti il sito) e **nessun token di sessione**:

```
POST /storage/v1/object/list/documenti-veicoli  { prefix: "patenti" }
→ HTTP 200 — elenco completo dei file, incluse le 2 foto patente (fronte/retro) del test driver

POST /storage/v1/object/list/cedolini
→ HTTP 200 — elenco completo, incluso "1790515793737-Togni_Marco-Ottobre-2026.pdf"

GET /storage/v1/object/documenti-veicoli/patenti/<uuid>_fronte.png
→ HTTP 200, content-length: 121405, content-type: image/png
  (download completo dell'immagine, SENZA passare da alcun link firmato)
```

Nessun login, nessun cookie, nessun token utente: solo la stessa chiave che il browser di **qualsiasi** visitatore del sito scarica automaticamente aprendo la home page.

### Causa tecnica

Su `storage.objects` esistono ancora policy **permissive**, residuo di un'iterazione precedente del progetto, che concedono accesso `TO PUBLIC` (cioè anche al ruolo `anon`, non autenticato) senza alcuna condizione:

```sql
CREATE POLICY "Permetti upload pubblico documenti" ON storage.objects
  FOR ALL TO PUBLIC
  USING (bucket_id = 'documenti-veicoli')
  WITH CHECK (bucket_id = 'documenti-veicoli');

CREATE POLICY "Consenti lettura PDF cedolini" ON storage.objects
  FOR SELECT TO PUBLIC
  USING (bucket_id = 'cedolini');

CREATE POLICY "Consenti upload PDF cedolini" ON storage.objects
  FOR INSERT TO PUBLIC
  USING (bucket_id = 'cedolini');
```

In un secondo momento sono state aggiunte le policy corrette e granulari che oggi si vedono nel codice/documentazione (`restringi_lettura_documenti_veicoli`, `restringi_lettura_cedolini_bucket`, ecc.), pensate per limitare l'accesso al proprio file o all'admin. **Il problema è che queste policy correttive sono scritte `AS RESTRICTIVE ... TO authenticated`.**

In PostgreSQL, quando su una tabella convivono policy *permissive* e *restrictive*, la regola finale è:

```
accesso consentito = (permissive1 OR permissive2 OR ...) AND (restrictive1 AND restrictive2 AND ...)
```

Ma una policy `TO authenticated` si applica **solo** alle richieste fatte con un ruolo Postgres `authenticated` (cioè un utente loggato). Una richiesta con la sola chiave `anon` non autenticata ha ruolo Postgres `anon`: per quel ruolo, le policy restrittive **non vengono nemmeno valutate**, quindi non restringono nulla. Resta in vigore solo la vecchia policy permissiva `TO PUBLIC`, che per `documenti-veicoli` e `cedolini` non ha **nessuna** condizione legata a `auth.uid()` — è un `true` incondizionato.

Risultato: le protezioni "vere" (link firmati lato applicazione, RLS granulare) proteggono solo chi rispetta il flusso dell'app. Chi chiama l'API Storage direttamente con la chiave pubblica bypassa tutto.

### Impatto concreto
- Un attaccante non ha bisogno di **nessun account**, nemmeno di prova: gli basta la chiave pubblica, ottenibile da chiunque apra il sito (view-source o DevTools → Network).
- Può enumerare ed esfiltrare **tutte** le foto patente (fronte/retro, documento d'identità con foto, dati anagrafici, firma) e **tutte** le buste paga (dati retributivi) di ogni autista, presente e futuro.
- Le stesse policy permissive coprono anche INSERT (upload) e, per `documenti-veicoli`, l'intera superficie FOR ALL — quindi in teoria (non testato, per non modificare dati) permetterebbero anche di sovrascrivere/cancellare documenti altrui in modo anonimo.
- Con 70 furgoni e un organico che crescerà, ogni nuovo autista che carica la patente in fase di registrazione espone immediatamente il proprio documento d'identità a chiunque.

### Correzione proposta (da applicare solo dopo tua conferma)
Cancellare le 3 vecchie policy permissive ormai superate (`Permetti upload pubblico documenti`, `Consenti lettura PDF cedolini`, `Consenti upload PDF cedolini`) — le policy granulari già esistenti (`restringi_*`, `admin_*`) coprono già tutti i casi d'uso legittimi (proprio file, admin, documento firmato indirizzato a te). Non serve altro codice applicativo: è solo SQL su `storage.objects`.

```sql
DROP POLICY IF EXISTS "Permetti upload pubblico documenti" ON storage.objects;
DROP POLICY IF EXISTS "Consenti lettura PDF cedolini" ON storage.objects;
DROP POLICY IF EXISTS "Consenti upload PDF cedolini" ON storage.objects;
```

Dopo la correzione andrebbe ripetuto lo stesso test (chiave anon, nessun login) per confermare che l'accesso torni a dare 401/0 righe.

---

## 2. CRITICO — Token Telegram esposto nella storia Git pubblica

### Come ragiona un attaccante
"Il codice attuale legge il token da variabile d'ambiente, quindi è al sicuro" è un ragionamento incompleto: un attaccante non guarda solo l'ultimo commit, guarda **tutta la storia** di un repository pubblico, che su GitHub resta consultabile per sempre (anche via API non autenticata) a meno di una riscrittura attiva della storia.

### Cosa ho trovato
```
git log --all -p -S "8869110646" --source

commit 773074f (3 settembre 2026):
+ const TELEGRAM_BOT_TOKEN = '8869110646:AAEwimc2bMvITHVpQLPks8SzHyb2EaqHVLU';

commit 9b7a6ed (16 settembre 2026):
- const TELEGRAM_BOT_TOKEN = '8869110646:AAEwimc2bMvITHVpQLPks8SzHyb2EaqHVLU';
+ const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
```

Il repository `giampy06/citycargo-app` è **pubblico** (verificato via API GitHub non autenticata: `"private": false`). Chiunque può clonarlo ed estrarre il token con lo stesso comando, in pochi secondi, senza alcun exploit — è dato pubblicato, non un bug da sfruttare.

### Impatto concreto
Con il token, un attaccante può usare l'API `https://api.telegram.org/bot<TOKEN>/...` per:
- inviare messaggi come se fossero il bot (es. un falso "🟢 Tutto funziona correttamente" per mascherare un problema reale, o un falso alert per creare confusione/phishing interno verso l'amministratore),
- leggere gli aggiornamenti recenti (`getUpdates`) se non consumati da un webhook, potenzialmente scoprendo il `chat_id` reale e altri metadati,
- modificare le impostazioni del bot (nome, descrizione, comandi).

Non è un accesso ai dati aziendali (il bot manda solo notifiche), ma è un canale di comunicazione con l'amministratore che un attaccante potrebbe usare per social engineering o per silenziare/falsificare gli alert di sicurezza proprio nel momento in cui servono di più.

### Correzione proposta
1. **Rigenerare subito il token** tramite BotFather (`/revoke` sul bot esistente, o crearne uno nuovo) — è l'unica correzione realmente efficace: il vecchio token resta comunque nella storia pubblica per sempre.
2. Aggiornare `TELEGRAM_BOT_TOKEN` su Vercel col nuovo valore.
3. (Facoltativo, solo per igiene, da fare *dopo* la rotazione) riscrivere la storia con `git filter-repo` per rimuovere il valore letterale — utile solo a ripulire, non a "richiudere" l'esposizione, perché il valore vecchio è già stato pubblico.

---

## 3. IMPORTANTE — Bucket storage legacy pubblici (oggi vuoti)

Interrogando l'API storage con la service role (solo lettura, nessuna scrittura) ho trovato **3 bucket ulteriori**, non referenziati da nessun file nel codice attuale, impostati a livello di bucket come `public: true`:

| Bucket | Pubblico | Oggetti oggi |
|---|---|---|
| `driver-documents` | ✅ sì | 0 |
| `cedolini-pdf` | ✅ sì | 0 |
| `verbali-furgoni` | ✅ sì | 0 |

Un bucket Supabase `public: true` serve i file tramite un URL pubblico diretto (`/storage/v1/object/public/...`) **senza alcuna verifica RLS**, indipendentemente da qualsiasi policy scritta su `storage.objects`. Oggi sono vuoti (verificato con una list reale), quindi **nessun dato è esposto in questo momento** — ma è una trappola innescata: basta che in futuro qualcuno (un altro sviluppatore, uno script di importazione, un ripristino da backup mal fatto) scriva anche un solo file in uno di questi bucket perché diventi immediatamente pubblico su internet, senza bisogno di alcun attacco.

In più, `verbali-furgoni` ha anche una policy RLS permissiva rimasta attiva (`"Storage public access verbali" FOR ALL TO PUBLIC`) — stesso identico bug del punto 1, ma su un bucket che al momento non contiene nulla.

### Correzione proposta
- Impostare i 3 bucket a `public: false` (o cancellarli, dato che sono residui di un'iterazione precedente e non referenziati da nulla — coerente con la nota "tabelle morte" già presente in `CONTEXT-PER-CLAUDE-CODE.md` per le tabelle gemelle `driver_profiles`/`profiles`/`buste_paga`).
- Cancellare la policy `"Storage public access verbali"`.

---

## 4. IMPORTANTE — Nessun header di sicurezza (CSP / X-Frame-Options)

`next.config.ts` non definisce alcun blocco `headers()`, e non esiste alcun `middleware.ts` nel progetto. Di conseguenza il sito non invia:
- `X-Frame-Options` / `frame-ancestors` → **nessuna protezione da clickjacking**: un sito malevolo potrebbe incorporare `/flotta`, `/autisti` o qualsiasi pagina admin in un iframe invisibile e indurre un amministratore già loggato a cliccare pulsanti reali (es. "elimina veicolo", "approva autista") pensando di interagire con un'altra pagina.
- `Content-Security-Policy` → nessun contenimento aggiuntivo in caso di una futura vulnerabilità XSS (oggi non ne ho trovate, vedi punto 6 dell'analisi input, ma un CSP è la rete di sicurezza che limita il danno *se* dovesse comparirne una).
- `X-Content-Type-Options: nosniff` → il browser può tentare di "indovinare" il tipo di un file scaricato (es. un documento caricato con estensione ambigua) invece di fidarsi del Content-Type dichiarato.

### Correzione proposta
Aggiungere in `next.config.ts`:
```ts
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
    ],
  }];
}
```
(Una CSP più completa — `script-src`, `connect-src` verso il dominio Supabase, ecc. — richiede un giro di test più ampio per non rompere nulla; il `frame-ancestors 'none'` da solo copre già il rischio principale, il clickjacking, senza alcun rischio di rottura.)

---

## 5. IMPORTANTE — RPC critiche eseguibili anche da `anon`

Le funzioni `avvia_turno`, `chiudi_turno`, `is_admin`, `blocca_autopromozione_ruolo` hanno tutte:
```sql
GRANT EXECUTE ON FUNCTION ... TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
```

Oggi questo è **innocuo**: ogni funzione controlla esplicitamente `IF auth.uid() IS NULL THEN RAISE EXCEPTION` come prima riga, quindi una chiamata anonima fallisce sempre. Lo segnalo comunque come IMPORTANTE (non MINORE) perché è precisamente il tipo di concessione troppo ampia che, combinata con un futuro refactor disattento di una di queste funzioni (es. qualcuno riordina la logica e sposta quel controllo più in basso, dopo un'operazione con effetti collaterali), trasformerebbe silenziosamente un bug di logica in un buco di sicurezza sfruttabile da chiunque, senza login. È lo stesso identico pattern di errore che ha causato il punto 1 (una protezione "di superficie" rimasta più permissiva del necessario, che smette di essere innocua solo quando qualcos'altro cambia).

### Correzione proposta
```sql
REVOKE EXECUTE ON FUNCTION public.avvia_turno(text, text, numeric, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.chiudi_turno(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.blocca_autopromozione_ruolo() FROM PUBLIC, anon;
```
(`is_admin()` è invocata anche da altre policy RLS internamente come `SECURITY DEFINER`, quindi il `REVOKE` da `anon` non la rompe per l'uso interno — l'uso interno da parte del motore RLS non passa dai GRANT di un ruolo di sessione.)

---

## 6. MINORE — `src/lib/supabase.ts`: file morto con chiave hardcoded

```ts
const SUPABASE_URL = 'https://rudccmhlfmrbegaxrbgs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KT2Tt29GtN4-lhjTkLp5rA_ttve7sj5';
```

Nessun file nel progetto importa `@/lib/supabase` (tutti usano `@/supabase`, il file corretto che legge da `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`). È codice morto, risalente ai primi commit (`3448add`, "Hardcode Supabase URL and Key to fix 500 runtime error"). La chiave qui dentro è quella **pubblica/publishable** (equivalente concettualmente all'anon key, progettata per stare nel bundle client — la sua protezione è la RLS, non la segretezza), quindi non è un segreto in senso stretto. Il rischio reale è **di manutenzione**: un file con questo nome e questo contenuto può indurre qualcuno in futuro a reimportarlo pensando sia la versione "giusta" o "di fallback", o confonderlo con una vera chiave privata quando si cerca segreti nel codice.

### Correzione proposta
Cancellare `src/lib/supabase.ts`.

---

## 7. MINORE — `npm audit`

```
uuid  <11.1.1
Severity: moderate
Missing buffer bounds check in v3/v5/v6 when buf is provided
via: exceljs → uuid
```

Un'unica vulnerabilità *moderate*, indiretta (arriva da `exceljs`, usata per generare il file Excel di export presenze). Il problema riguarda `uuid.v3/v5/v6` quando gli si passa esplicitamente un buffer proprio (`buf` option) — `exceljs` usa `uuid` solo internamente per generare ID interni al file, non con input controllato dall'utente né passando mai un `buf` custom. Non risulta un percorso realistico di sfruttamento nel nostro utilizzo. La fix (`npm audit fix --force`) forza `exceljs` a una major precedente (breaking change) — da valutare con calma quando c'è tempo per ritestare l'export, non è urgente.

---

## 8. Foto patenti in fase di registrazione — valutazione del rischio residuo

### Premessa
Questa valutazione assume che il punto 1 (CRITICO) sia già stato corretto — cioè che le patenti siano *davvero* raggiungibili solo con login proprio o admin, come il codice applicativo dà per scontato. **Prima di quella correzione il rischio non è "residuo": è già realizzato al 100%**, come dimostrato sopra.

### Ragionamento da attaccante, assumendo le protezioni intenzionate funzionanti
Se le RLS/signed URL funzionano come progettate, per arrivare alle foto patente un attaccante deve prima ottenere **l'accesso a un account admin** (non a un account autista qualunque: un autista può vedere solo la propria patente). Quindi il rischio specifico della foto si somma al rischio, già esistente comunque, di un account admin compromesso — la domanda vera è: *quanto peggiora le cose, in caso di compromissione admin, il fatto che ci sia anche la foto e non solo numero+scadenza?*

Peggiora in modo concreto, per tre motivi:

1. **Aggregazione**: un admin compromesso dà accesso a *tutte* le patenti in un colpo solo (oggi poche decine, ma la flotta è già a 70 mezzi e in crescita). Un elenco di foto ad alta risoluzione di documenti d'identità con foto-tessera, dati anagrafici e firma è un bottino molto più "vendibile"/riutilizzabile (furto d'identità, apertura di conti/finanziamenti a nome altrui) di un elenco di soli numeri patente + scadenza, che da soli non bastano quasi mai a impersonare qualcuno.
2. **Superficie del link firmato**: un URL firmato, per quanto a scadenza breve, è comunque un segreto che transita (cronologia browser, screenshot condiviso per errore, proxy aziendale, dispositivo dell'admin compromesso) — un dato puramente testuale dentro il database, dietro RLS, non ha questo canale di fuga aggiuntivo.
3. **Obblighi privacy**: una foto di un documento d'identità è dato personale "ad alto impatto" in caso di violazione (rientra tipicamente tra i dati che rendono più probabile l'obbligo di notifica al Garante Privacy e agli interessati in caso di data breach, rispetto a un numero patente isolato).

### Raccomandazione
Non è un secco "tieni" o "togli": la raccomandazione concreta è **mantenere la verifica visiva della foto solo per il tempo strettamente necessario all'approvazione, poi cancellarla**.

- In fase di registrazione, l'autista carica comunque fronte/retro (serve per un controllo umano reale — un numero digitato può essere sbagliato o falso, una foto no).
- L'admin la verifica in fase di approvazione (flusso già esistente: `autisti.stato = 'in_attesa'` → approvazione).
- Una volta approvato, il file va **cancellato dallo storage** (mantenendo solo `numero_patente` e `scadenza_patente`, già presenti come campi separati e sufficienti per il monitoraggio scadenze già implementato).

Questo dà il beneficio della verifica (che numero+scadenza da soli non danno: chiunque potrebbe scrivere un numero e una data a caso) **senza** tenere in giro a tempo indefinito un archivio crescente di documenti d'identità fotografici, che è la parte che pesa di più in caso di violazione. Se questo passaggio di cancellazione post-approvazione non è realizzabile a breve, allora la seconda scelta più sensata è passare a solo numero+scadenza: la foto oggi non viene ri-verificata periodicamente (non c'è un controllo "la foto corrisponde ancora" dopo il primo check), quindi il suo valore nel tempo decresce mentre il rischio di conservarla resta costante o cresce con l'archivio.

---

## Cose verificate e risultate a posto (per completezza)

- **Tabelle**: tutte le policy RLS a livello di tabella (`autisti`, `cedolini`, `documenti_aziendali`, `profili`, `turni_presenze`, `veicoli`, `vehicle_expenses`, `verbali_foto`, e le 3 tabelle nuove `permessi_ztl`/`tariffe_giri`/`extra_servizi`) sono condizionate correttamente su `auth.uid()`/`is_admin()` — a differenza dello storage, qui non c'è nessuna policy `TO PUBLIC` priva di condizione. Testato che per il ruolo anonimo il risultato è sempre vuoto/negato.
- **API routes**: le 4 route non-cron (`crea-autista`, `export-foglio-presenze`, `analyze-expenses`, `parse-dkv`) verificano tutte token + `is_admin()` via RPC prima di fare qualsiasi cosa, usando il token di chi chiama (non una chiave privilegiata) — un autista autenticato che le chiamasse direttamente riceverebbe 403.
- **Cron routes**: entrambe (`lunedimattina`, `controllo-salute`) falliscono chiuse (`401`) se `CRON_SECRET` non combacia o non è impostato.
- **`avvia_turno`/`chiudi_turno`**: l'importo del compenso è calcolato **lato server** dalla tabella `tariffe_giri` in base al `giro` scelto, mai fidandosi di un valore numerico passato dal client — un autista non può alterare il proprio compenso manipolando la richiesta.
- **Nessun segreto vero** (service role key, Gemini key, CRON_SECRET) risulta mai stato committato, né oggi né nella storia — cercato con pattern mirati su tutta la storia Git.
- **Nessun `.env*`** è mai stato tracciato da Git.
- **Nessun `dangerouslySetInnerHTML`, `eval`, `new Function`** nel codice.
- **Path traversal**: gli unici path costruiti con input utente (estensione file in upload patente) restano comunque vincolati al prefisso `patenti/<proprio-uuid>` dalla policy RLS (il carattere `_` dopo l'uuid è un wildcard LIKE a un carattere, non un problema); Supabase Storage non risolve `..` come un vero filesystem, quindi non c'è un vettore di traversal reale verso altri bucket/path.

---

## Riepilogo azioni proposte (nessuna applicata)

| # | Azione | Tipo |
|---|---|---|
| 1 | `DROP` delle 3 policy storage permissive obsolete su `documenti-veicoli`/`cedolini` | SQL, urgente |
| 2 | Rigenerare il token Telegram via BotFather + aggiornare env Vercel | Azione manuale, urgente |
| 3 | Impostare privati (o cancellare) i 3 bucket legacy pubblici + rimuovere la policy permissiva su `verbali-furgoni` | SQL/Dashboard |
| 4 | Aggiungere header di sicurezza in `next.config.ts` | Codice |
| 5 | `REVOKE EXECUTE ... FROM anon` sulle 4 funzioni RPC | SQL |
| 6 | Cancellare `src/lib/supabase.ts` (file morto) | Codice |
| 7 | Valutare l'aggiornamento di `exceljs`/`uuid` quando c'è tempo per ritestare l'export | Dipendenza, non urgente |
| 8 | Decidere il workflow patenti: verifica-poi-cancella (consigliato) oppure solo numero+scadenza | Decisione di prodotto |

Fammi sapere quali correzioni vuoi che applichi e in che ordine — partirei dal punto 1, che è quello attivamente sfruttabile oggi.
