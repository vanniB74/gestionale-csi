# C.S.I. — Gestionale Pratiche Ufficio

Gestionale web interno per l'ufficio C.S.I. — Centro Servizi Integrati (Ceglie del Campo, Bari).
Costruito da zero su Next.js, con il sistema visivo del Brand Book 2025 (navy `#001C3A`, avorio
`#F7F4ED`, oro `#C7A45F`, Inter Tight / Inter / JetBrains Mono).

La welcome page pubblica introduce il gestionale con l'animazione GIF dello sportello; l'area
riservata raccoglie anagrafiche, documenti, mandati, pratiche e backup.

---

## Avvio

```bash
npm install
npm run dev
```

Apri `http://localhost:3000`.

Build di produzione:

```bash
npm run analyze   # report dipendenze
npm run build
npm run start
```

## Accessi

| Ruolo | Username | Password |
|---|---|---|
| Webmaster | `giovanni.burdi` | password concordata con il committente (vedi `lib/seed.ts`; il pulsante demo in login la compila) |
| Operatore desk | `antonella.ruggiero` | `csi2026` |
| Operatore desk | `michele.lorusso` | `csi2026` |
| Consulente | `laura.ventrella` | `csi2026` |

Il webmaster può creare nuovi operatori, impostare le credenziali e scollegare il telefono
abbinato al QR. Il primo accesso con credenziali abbina il dispositivo corrente.

> In questa build l'autenticazione e l'archivio sono **client-side** (localStorage): è un
> prototipo dimostrativo, non un sistema pronto per dati reali. Vedi «Limiti» in fondo.

## Cosa include

- **Welcome page** con GIF dello sportello, claim, statistiche, percorso in 5 passi, contatti e
  profili social animati.
- **Barra ecosistema** su tutte le pagine del gestionale: Sito ufficiale, Finanziamenti, Utenze,
  Legal Aid e Ricalcolo pensione, ciascuno con il proprio logo trasparente e il popup iframe. Space Z
  e Conf.SELP restano nel menu «Altri progetti»; i siti che bloccano l'incorporamento mostrano
  un'apertura protetta con link diretto.
- **Social**: LinkedIn e Facebook con piccoli loop video, sempre cliccabili, in hero, login, barra
  superiore, sidebar e footer.
- **Login** con credenziali o QR rotante ogni 20 secondi; abbinamento del dispositivo e
  scollegamento dal webmaster.
- **QR da telefono**: il QR codifica l'indirizzo di rete del computer (non `localhost`), il
  telefono accede e autorizza la postazione, che si sblocca da sola. Richiede che telefono e
  computer siano sulla stessa rete Wi-Fi.
- **Dashboard** con avvisi, agenda, azioni da chiudere, mandati in scadenza e copertura per area.
- **Anagrafiche clienti** con sottomenu Anagrafica / Documenti e varie / Moduli / Pratica aperta.
- **Percorso pratica in 5 passi**: appuntamento → anagrafica → documenti → moduli → pratica.
- **Documenti d'identità**: fronte, retro e codice fiscale in tre contenitori separati, con
  trascrizione di numero, scadenza ed ente di rilascio.
- **Mandato e privacy** stampabili in A4, compilati dai dati del cliente, con scansione firmata
  accanto al modulo elettronico.
- **Controllo mandato** a tre esiti: omnibus valido, mandato valido per il servizio, agenzia
  scoperta/scaduta. Il pulsante «Nuovo mandato» apre il popup senza lasciare la pratica.
- **Catalogo servizi** CNT-01…CNT-06 con codici originali, attivazione per contenitore riservata
  al webmaster. Solo i servizi attivi compaiono nelle pratiche.
- **Area webmaster**: profilo, staff, credenziali, QR, riepilogo catalogo e **backup**.
- **Backup locale e cloud**: export/import JSON, condivisione di sistema verso Drive/OneDrive/
  iCloud, salvataggio in cartella sincronizzata, endpoint cloud opzionale (POST/GET).
- **Diagnostica e qualità**: analisi dipendenze, laboratorio test su fixture esterna, analisi
  workflow, registro errori, guardiani runtime e generatore di fix prompt per code agent.

## Diagnostica, guardiani e test

La voce **Diagnostica** (area Webmaster) contiene sei sezioni:

1. **Panoramica** — finding, stato test, cicli di dipendenza, errori e flusso operativo.
2. **Dipendenze** — report statico di import, cicli, moduli orfani, pacchetti e rotte. Si genera con
   `npm run analyze` ed è disponibile in `public/reports/dependencies.json`.
3. **Test** — laboratorio che legge la fixture esterna, costruisce una sandbox in memoria, esegue i
   casi e scarta i record. Mostra sempre `Record di test nell'archivio = 0`.
4. **Workflow** — copertura mandati, azioni arretrate, documenti/privacy mancanti, pratiche ferme,
   numeri duplicati e record orfani.
5. **Errori** — registro locale alimentato dai guardiani, con stack, contesto e download Markdown.
6. **Fix prompt** — selezione dei finding e generazione di un prompt deterministico, copiabile o
   scaricabile, per Cursor / Claude Code / agenti compatibili. Nessun modello esterno viene chiamato:
   il prompt è costruito solo dai dati locali e dal report dipendenze.

### Guardiani runtime

- `components/Guard.tsx` — error boundary dell'area gestionale.
- `app/error.tsx`, `app/(app)/error.tsx`, `app/global-error.tsx` — error boundary di rotta e globale.
- `components/Observability.tsx` — `error` e `unhandledrejection` globali.
- `lib/guards.ts` — registro errori (localStorage, max 80 voci), download e helper `guardSync` /
  `guardAsync`.
- `lib/api-guard.ts` — wrapper delle API con requestId e log strutturato lato server.

Gli errori API non finiscono nel localStorage: vengono scritti nel log del server con un requestId.

## Dati esterni e record di test

Nessun record dimostrativo è scritto nei componenti:

- `data/demo-office.json` — tabella esterna dell'archivio demo, caricata da `lib/seed.ts`.
- `public/test-data/office.json` — fixture del laboratorio test.
- `public/test-data/cases.json` — tabella dei casi e degli attesi.

Il runner dei test crea una copia del database, applica la fixture e scarta la sandbox. Dopo il run
`cleanupTestRecords()` elimina eventuali record con prefisso `test-`; il risultato mostrato in
Diagnostica è sempre zero record persistenti. Il comando **Svuota archivio operativo** in Webmaster
rimuove clienti, documenti, mandati, pratiche e appuntamenti mantenendo staff, catalogo e webmaster.

## Design system

Token in `app/globals.css`:

| Token | Valore | Uso |
|---|---|---|
| `--navy` | `#001C3A` | chrome, titoli, superfici dominanti |
| `--slate` | `#39546B` | testi secondari, icone |
| `--mist` | `#99A7B3` | note, metadati |
| `--ivory` | `#F7F4ED` | fondo editoriale |
| `--paper` | `#FFFDF8` | card e superfici carta |
| `--gold` | `#C7A45F` | accenti, hairline, indicatori |

Tipografia: Inter Tight per i titoli, Inter per il corpo, JetBrains Mono per codici, date e
numeri. Proporzione cromatica 60/25/10/5, come da brand book. Logo positivo su avorio, negativo
su navy, con area di rispetto.

## Struttura

```
app/
  page.tsx                 welcome page con GIF
  login/                   accesso credenziali + QR
  (app)/                   area riservata con shell
    dashboard/
    pratiche/              elenco, nuova (wizard), dettaglio
    clienti/               elenco, scheda con sottomenu
    servizi/               catalogo e attivazione
    diagnostica/           dipendenze, test, workflow, errori, fix prompt
    webmaster/             staff, credenziali, QR, backup
    moduli/                mandato e privacy stampabili
components/                shell, tabelle, moduli A4, backup, social, guardiani
lib/                       tipi, seed loader, store, catalogo, backup, upload, analysis, test lab
scripts/analyze.mjs        generatore del report dipendenze
data/demo-office.json      tabella esterna dell'archivio demo
public/test-data/          fixture e casi dei test (esterni al codice)
public/reports/            report dipendenze generato
public/brand/              logo, GIF, poster, favicon
```

## Backup

### Locale

`Webmaster → Backup e ripristino → Scarica backup` produce un JSON con l'intero archivio
(anagrafiche, documenti, mandati, pratiche, staff, catalogo, progressivo). Il ripristino sostituisce
integralmente l'archivio locale ed è irreversibile.

### Cloud

Tre modalità, in ordine di disponibilità:

1. **Salva su cloud** — condivisione di sistema con il file JSON; su mobile/desktop si sceglie
   Google Drive, OneDrive, iCloud, e-mail, ecc.
2. **Cartella cloud** — File System Access API: scegli una cartella sincronizzata con il tuo
   provider; il file viene scritto lì.
3. **Endpoint** — URL e token opzionali salvati nel browser. Il gestionale invia
   `POST <endpoint>` con il JSON e `Authorization: Bearer <token>`; per il ripristino usa
   `GET <endpoint>`. L'endpoint deve consentire CORS dal dominio dell'app.

Il backup contiene dati personali e credenziali in chiaro: va conservato in un luogo protetto.

## QR e accesso da telefono

Aprendo il gestionale da `localhost`, il QR usa automaticamente l'indirizzo IPv4 di rete del
computer (es. `http://192.168.1.5:3000`) letto da `/api/network`. Il telefono deve essere
connesso alla **stessa rete Wi-Fi** del computer: con i dati mobili (4G/5G) un indirizzo privato
non è raggiungibile. In produzione (Vercel) il QR usa il dominio pubblico e funziona da qualsiasi
rete.

Flusso:

1. Il computer mostra il QR e crea una richiesta di abbinamento.
2. Il telefono apre il link, accede con le proprie credenziali e conferma l'autorizzazione.
3. Il computer, che interroga lo stato della richiesta, entra nel gestionale con quel profilo.

Il QR si rinnova ogni 20 secondi; le richieste restano valide 2 minuti per dare il tempo di
accedere. Lo stato di abbinamento è tenuto in memoria dal processo Next: funziona in locale e su
una singola istanza. Per un deploy Vercel multi-istanza va sostituito con un KV condiviso
(Upstash/Vercel KV) o un database.

## Deploy su Vercel

Il progetto è pronto per Vercel (Next.js 16, nessuna variabile d'ambiente obbligatoria):

```bash
npx vercel link      # crea/collega un progetto
npx vercel --prod
```

`vercel.json` imposta header di sicurezza (`X-Frame-Options: SAMEORIGIN`, `nosniff`,
`Referrer-Policy`, `Permissions-Policy`). Il deploy non è stato eseguito da qui: manca
un'autorizzazione Vercel per un progetto specifico e il progetto linkato in `.vercel/` va
confermato prima di sovrascriverlo.

## Ecosistema e iframe

Verifica header al 24/11/2026:

| Sito | Esito |
|---|---|
| `csi-bari.surge.sh` | incorporabile |
| `csi-finanziamenti.vercel.app` | incorporabile |
| `landing-cselp-...vercel.app` | incorporabile |
| `csi-pensioni-rho.vercel.app` | `X-Frame-Options: SAMEORIGIN` → apertura in nuova scheda |
| `j1bg49v2dud0-d.space-z.ai` | HTTP 500, deploy non disponibile → fallback |

Gli header possono cambiare a ogni deploy; il fallback resta nel popup.

## Limiti e passaggio in produzione

Questa build è un **prototipo funzionale** con dati locali, pensato per validare il flusso e il
design con l'ufficio. Prima dell'uso reale servono:

- autenticazione server-side (sessioni, hash delle password, ruoli) al posto del login client-side;
- database e object storage per documenti e scansioni (Postgres/Supabase + blob privato), al posto
  del localStorage (~5 MB, con immagini compresse e avviso di esaurimento);
- logging delle azioni e conservazione a norma dei mandati;
- QR di accesso reale con canale sicuro tra postazione e telefono (il pairing è in memoria del
  processo Next: funziona in locale/single instance, non su Vercel multi-istanza senza KV);
- cifratura e retention del backup cloud, con endpoint gestito lato server;
- rimozione delle credenziali demo da `data/demo-office.json` e sostituzione con un bootstrap
  protetto (variabili d'ambiente o prima configurazione).

Il file `data/demo-office.json` contiene solo dati fittizi e le credenziali dimostrative: non va
usato con dati reali. **Svuota archivio operativo** rimuove i record dimostrativi mantenendo
catalogo e staff.

Il codice è organizzato per sostituire lo store locale (`lib/store.tsx`) con API senza riscrivere
le pagine. I guardiani e il registro errori restano utili anche dopo il passaggio a un backend.
