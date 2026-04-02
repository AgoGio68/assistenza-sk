const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();

/**
 * Helper per inviare messaggi WhatsApp tramite Meta Graph API
 */
async function sendWhatsAppMessage(to, body, db) {
    const statsRef = db.collection("system").doc("whatsapp_stats");
    const currentMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"

    try {
        // 1. Gestione Contatore e Blocco Sicurezza (900 messaggi)
        const statsDoc = await statsRef.get();
        let count = 0;
        let lastMonth = "";

        if (statsDoc.exists) {
            const data = statsDoc.data();
            count = data.count || 0;
            lastMonth = data.lastMonth || "";
        }

        // Reset contatore se il mese è cambiato
        if (lastMonth !== currentMonth) {
            count = 0;
            await statsRef.set({ count: 0, lastMonth: currentMonth }, { merge: true });
        }

        if (count >= 900) {
            console.warn("🛑 Limite WhatsApp raggiunto (900/mese). Invio bloccato.");
            return false;
        }

        // 2. Invio effettivo (Richiede configurazione variabili d'ambiente)
        // NOTA: Il token e l'ID devono essere impostati via Firebase Config / Secrets
        const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; 
        const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

        if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
            console.error("❌ Variabili d'ambiente WhatsApp mancanti (TOKEN/ID).");
            return false;
        }

        const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
        const response = await fetch(url, {
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
        });

        if (response.ok) {
            // 3. Incremento contatore solo se invio riuscito
            await statsRef.update({
                count: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp()
            });
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
    const db = getFirestore();

    // Prepariamo i messaggi
    const title = t.urgency === 'urgente' ? `🚨 TICKET URGENTE: ${t.companyName}` : `Nuova Assistenza: ${t.companyName}`;
    const desc = t.description ? t.description.substring(0, 100) : "Nuova richiesta registrata";
    const waBody = `${title}\n---\n${desc}\n\nGestisci in: https://assistenza-sk.web.app/admin`;

    try {
        // Recuperiamo tutti gli admin/superadmin approvati
        const snapUsers = await db.collection("users").where("status", "==", "approved").get();
        
        const fcmTokens = [];
        const waNumbers = [];

        snapUsers.forEach(doc => {
            const data = doc.data();
            if (data.role === "admin" || data.role === "superadmin") {
                if (data.fcmToken) fcmTokens.push(data.fcmToken);
                // Assumiamo che il numero sia nel campo 'phone' in formato internazionale es: 393331234567
                if (data.phone && data.phone.length >= 10) {
                    // Pulizia base del numero (rimozione spazi, trattini, parentesi)
                    const cleanPhone = data.phone.replace(/\D/g, "");
                    if (cleanPhone.length >= 10) waNumbers.push(cleanPhone);
                }
            }
        });

        // 1. Invio Notifiche Push (FCM) — funzionano sempre, indipendentemente da WhatsApp
        if (fcmTokens.length > 0) {
            const payload = {
                notification: { title, body: desc },
                data: { url: "/admin" }
            };
            const fcmResp = await getMessaging().sendEachForMulticast({
                tokens: fcmTokens,
                notification: payload.notification,
                data: payload.data,
            });
            console.log(`✅ FCM inviate: ${fcmResp.successCount}`);
        }

        // 2. Invio WhatsApp — gated da settings/global.whatsappEnabled (v3.3.1)
        const settingsDoc = await db.collection("settings").doc("global").get();
        const whatsappEnabled = settingsDoc.exists ? (settingsDoc.data().whatsappEnabled === true) : false;

        if (!whatsappEnabled) {
            console.log("🔕 WhatsApp in standby (whatsappEnabled=false). Solo FCM inviato.");
        } else {
            for (const number of waNumbers) {
                await sendWhatsAppMessage(number, waBody, db);
            }
        }

    } catch (error) {
        console.error("❌ Errore processamento notifiche:", error);
    }

    return null;
});

/**
 * Funzione Callable per inviare notifiche WhatsApp generiche dal frontend.
 * Usata per: Importazioni da Sheets, Sincronizzazione Calendario, ecc.
 */
exports.inviaNotificaWhatsApp = onCall(async (request) => {
    // Verifica autenticazione (opzionale, ma consigliato)
    if (!request.auth) {
        throw new Error("L'utente deve essere autenticato.");
    }

    const { body } = request.data;
    if (!body) {
        throw new Error("Il corpo del messaggio è obbligatorio.");
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
