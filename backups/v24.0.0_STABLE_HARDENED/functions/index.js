const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

/**
 * Helper per inviare messaggi WhatsApp tramite Meta Graph API
 */
async function sendWhatsAppMessage(to, body, db) {
    const statsRef = db.collection("system").doc("whatsapp_stats");
    const currentMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"

    try {
        // 1. Gestione Contatore e Blocco Sicurezza Atomico (900 messaggi)
        let canSend = false;
        await db.runTransaction(async (transaction) => {
            const statsDoc = await transaction.get(statsRef);
            let count = 0;
            let lastMonth = "";

            if (statsDoc.exists) {
                const data = statsDoc.data();
                count = data.count || 0;
                lastMonth = data.lastMonth || "";
            }

            if (lastMonth !== currentMonth) {
                count = 0;
            }

            if (count >= 900) {
                canSend = false;
                return; // Esce dalla transazione senza effettuare scritture
            }

            canSend = true;
            // Riserva lo slot incrementando atomicamente
            transaction.set(statsRef, { 
                count: count + 1, 
                lastMonth: currentMonth,
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
        });

        if (!canSend) {
            console.warn("🛑 Limite WhatsApp raggiunto (900/mese). Invio bloccato.");
            return false;
        }

        // 2. Invio effettivo (Richiede configurazione variabili d'ambiente)
        const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; 
        const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

        if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
            console.error("❌ Variabili d'ambiente WhatsApp mancanti (TOKEN/ID).");
            // Nota: in caso di fallimento qui, si perde 1 quota, ma si previene il Quota Leak
            return false;
        }

        const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
        
        // Timeout di sicurezza (10 secondi) per evitare l'hanging delle Cloud Functions
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        let response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: to,
                    type: "text",
                    text: { body: body }
                }),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (response.ok) {
            console.log(`📱 WhatsApp inviato correttamente a ${to}`);
            return true;
        } else {
            const errData = await response.json();
            console.error("❌ Errore API WhatsApp:", errData);
            return false;
        }
    } catch (error) {
        console.error("❌ Eccezione durante invio WhatsApp:", error);
        return false;
    }
}

exports.notificaNuovoTicket = onDocumentCreated("tickets/{ticketId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const t = snapshot.data();
    const ticketId = event.params.ticketId;
    const db = getFirestore();

    // VER 20.0.0 — Notifiche Push rimosse per pulizia. Solo WhatsApp (se abilitato).
    const title = "⚠️ NUOVO TICKET";
    const problema = t.description ? t.description.substring(0, 100) : "Nuova richiesta";
    const desc = `${t.companyName || "Cliente"} - ${problema}`;
    const waBody = `${title}\n---\n${desc}\n\nGestisci in: https://assistenza-sk-official.web.app/admin`;

    console.log(`[TICKET ${ticketId}] Nuovo ticket ricevuto. Avvio notifiche...`);

    try {
        const waNumbers = [];
        let specificAssigneeFound = false;

        // Se c'è un assegnatario, troviamo il suo numero
        if (t.assignedTo) {
            const userDoc = await db.collection("users").doc(t.assignedTo).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                if (data.phone) {
                    const clean = data.phone.replace(/\D/g, "");
                    if (clean.length >= 10) waNumbers.push(clean);
                }
                specificAssigneeFound = true;
            }
        }

        // Altrimenti mandiamo a tutti gli admin
        if (!specificAssigneeFound) {
            const snapUsers = await db.collection("users").where("status", "==", "approved").get();
            snapUsers.forEach(doc => {
                const data = doc.data();
                if (data.role === "admin" || data.role === "superadmin") {
                    if (data.phone) {
                        const clean = data.phone.replace(/\D/g, "");
                        if (clean.length >= 10) waNumbers.push(clean);
                    }
                }
            });
        }

        // --- WhatsApp (gated da flag globale) ---
        const settingsDoc = await db.collection("settings").doc("global").get();
        const whatsappEnabled = settingsDoc.exists ? (settingsDoc.data().whatsappEnabled === true) : false;
        if (!whatsappEnabled) {
            console.log(`[TICKET ${ticketId}] WhatsApp disabilitato. Skip.`);
        } else {
            for (const number of waNumbers) {
                await sendWhatsAppMessage(number, waBody, db);
            }
        }

    } catch (error) {
        console.error(`[TICKET ${ticketId}] Errore critico processamento notifiche:`, error);
    }

    return null;
});

/**
 * Funzione Callable per inviare notifiche WhatsApp generiche dal frontend.
 * Usata per: Importazioni da Sheets, Sincronizzazione Calendario, ecc.
 */
exports.inviaNotificaWhatsApp = onCall(async (request) => {
    // 1. Controllo rigoroso RBAC (Role-Based Access Control)
    if (!request.auth) {
        throw new HttpsError('unauthenticated', "L'utente deve essere autenticato.");
    }
    
    if (request.auth.token.role !== 'admin' && request.auth.token.role !== 'superadmin') {
        console.error(`Tentativo di accesso non autorizzato da UID: ${request.auth.uid}`);
        throw new HttpsError('permission-denied', "Accesso negato. Privilegi insufficienti.");
    }

    const { body } = request.data;
    if (!body) {
        throw new HttpsError('invalid-argument', "Il corpo del messaggio è obbligatorio.");
    }

    const db = getFirestore();
    const waNumbers = [];

    try {
        // v3.3.1: Verifica master flag whatsappEnabled prima di qualsiasi operazione WA
        const settingsDoc = await db.collection("settings").doc("global").get();
        const whatsappEnabled = settingsDoc.exists ? (settingsDoc.data().whatsappEnabled === true) : false;

        if (!whatsappEnabled) {
            console.log("🔕 WhatsApp in standby (whatsappEnabled=false). Chiamata ignorata.");
            return { success: false, reason: "whatsapp_disabled" };
        }

        const snapUsers = await db.collection("users")
            .where("status", "==", "approved")
            .get();
        
        snapUsers.forEach(doc => {
            const data = doc.data();
            if (data.role === "admin" || data.role === "superadmin") {
                if (data.phone && data.phone.length >= 10) {
                    const cleanPhone = data.phone.replace(/\D/g, "");
                    if (cleanPhone.length >= 10) waNumbers.push(cleanPhone);
                }
            }
        });

        for (const number of waNumbers) {
            await sendWhatsAppMessage(number, body, db);
        }

        return { success: true, recipients: waNumbers.length };
    } catch (error) {
        console.error("❌ Errore invio notifica callable:", error);
        return { success: false, error: error.message };
    }
});


