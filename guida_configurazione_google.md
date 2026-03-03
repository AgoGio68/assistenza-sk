# Guida Configurazione Google Calendar - Assistenza SK

Questa guida contiene i passaggi necessari per configurare l'account Google definitivo per l'integrazione con il calendario.

## 1. Google Cloud Console
1. Accedi alla [Google Cloud Console](https://console.cloud.google.com/).
2. Assicurati che sia selezionato il progetto corretto (lo stesso collegato a Firebase).
3. Vai nel menu a sinistra -> **API e servizi** -> **Libreria**.
4. Cerca **"Google Calendar API"** e clicca su **Abilita**.

## 2. Schermata di Consenso OAuth (OAuth Consent Screen)
Questa è la parte più importante per far funzionare le autorizzazioni.
1. Vai in **API e servizi** -> **Schermata di consenso OAuth**.
2. Tipo di utente: **Esterno** (External). Clicca su **Crea**.
3. Compila le informazioni obbligatorie (Nome app, Email supporto, Email sviluppatore).
4. **Ambiti (Scopes):**
   - Clicca su **Aggiungi o rimuovi ambiti**.
   - Cerca ed aggiungi: `.../auth/calendar.events` (per poter leggere e scrivere gli eventi).
5. **Utenti di test:**
   - Se l'app non è ancora "Pubblicata" da Google, devi aggiungere qui l'indirizzo email che userai per testare il calendario.

## 3. Credenziali (Dati Utente)
1. Durante la configurazione delle credenziali (o se richiesto dall'app), scegli sempre **"Dati utente"** (User data) e NON "Dati applicazione".

## 4. Domini Autorizzati (In Firebase)
Assicurati che l'indirizzo dell'app sia autorizzato:
1. Vai nella **Console Firebase** -> **Authentication** -> **Settings**.
2. Sotto **Authorized domains**, verifica che ci sia `assistenza-sk.web.app`.

## 5. Utilizzo nell'App
1. Accedi all'app come **Superadmin**.
2. Clicca su **"Collega Google"**.
3. Se appare l'avviso "Google non ha verificato questa app":
   - Clicca su **Avanzate**.
   - Clicca su **Apri assistenza-sk.firebaseapp.com (non sicura)**.
   - Spunta la casella dei permessi per il Calendario e clicca su **Continua**.

L'app mostrerà **"Calendario Collegato"** e sarai pronto per pianificare gli interventi!
