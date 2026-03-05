# Guida Configurazione Google Calendar - Assistenza SK (Official)

Questa guida aggiornata ti permetterà di collegare il calendario al nuovo progetto `assistenza-sk-official`.

## 1. Google Cloud Console
1. Accedi alla [Google Cloud Console](https://console.cloud.google.com/).
2. Dal menu a tendina in alto, seleziona il progetto **assistenza-sk-official**.
3. Vai nel menu a sinistra -> **API e servizi** -> **Libreria**.
4. Cerca **"Google Calendar API"** e clicca su **Abilita**.

## 2. Schermata di Consenso OAuth (OAuth Consent Screen)
Questa configurazione è necessaria per autorizzare l'app a scrivere sul tuo calendario.
1. Vai in **API e servizi** -> **Schermata di consenso OAuth**.
2. Tipo di utente: **Esterno** (External). Clicca su **Crea**.
3. **Informazioni App:**
   - Nome app: `Assistenza SK Official`
   - Email supporto: la tua email
   - Email sviluppatore: la tua email
4. **Ambiti (Scopes):**
   - Clicca su **Aggiungi o rimuovi ambiti**.
   - Nella barra di ricerca scrivi `calendar.events`.
   - Seleziona la riga con `.../auth/calendar.events` (Permette di visualizzare e modificare gli eventi).
   - Clicca su **Aggiorna**.
5. **Utenti di test (Fondamentale):**
   - Finché l'app è in modalità "Testing", solo gli utenti aggiunti qui possono collegarsi.
   - Clicca su **Aggiungi utenti** e inserisci il tuo indirizzo Gmail (quello che userai per il calendario).

## 3. Credenziali OAuth
Firebase ha già creato delle credenziali per te, ma dobbiamo assicurarci che i domini siano corretti.
1. Vai in **API e servizi** -> **Credenziali**.
2. Trova la riga **"Web client (auto-created by Google Service)"** e clicca sull'icona della matita per modificarla.
3. In **Origini JavaScript autorizzate**, aggiungi:
   - `https://assistenza-sk-official.web.app`
   - `https://assistenza-sk-official.firebaseapp.com`
   - `http://localhost:5173` (per i test locali)
4. In **URI di reindirizzamento autorizzati**, aggiungi:
   - `https://assistenza-sk-official.firebaseapp.com/__/auth/handler`

## 4. Attivazione Provider Google in Firebase
1. Vai nella [Console Firebase](https://console.firebase.google.com/).
2. Vai in **Authentication** -> **Sign-in method**.
3. Clicca su **Aggiungi nuovo provider** e seleziona **Google**.
4. Clicca su **Abilita**, configura l'email di supporto del progetto e clicca su **Salva**.

## 5. Utilizzo nell'App
1. Accedi all'app: [https://assistenza-sk-official.web.app](https://assistenza-sk-official.web.app)
2. Come **Superadmin**, vai nella lista ticket.
3. Clicca sul pulsante in alto a destra **"Collega Google"**.
4. Segui la procedura di login (se appare "App non verificata", clicca su *Avanzate* -> *Apri progetto (non sicura)*).

Ora, quando prendi in carico un ticket e selezioni una data, potrai spuntare la casella **"Crea evento su Google Calendar"**!
