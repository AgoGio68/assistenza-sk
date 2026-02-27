const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

exports.notificaNuovoTicket = onDocumentCreated("tickets/{ticketId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const t = snapshot.data();
    const db = getFirestore();

    const payload = {
        notification: {
            title: t.urgency === 'urgente' ? `🚨 TICKET URGENTE: ${t.companyName}` : `Nuova Assistenza: ${t.companyName}`,
            body: t.description ? t.description.substring(0, 100) : "Nuova richiesta registrata"
        },
        apns: {
            payload: {
                aps: {
                    sound: "default"
                }
            }
        },
        data: {
            url: "/admin",
            click_action: "FLUTTER_NOTIFICATION_CLICK"
        }
    };

    try {
        // Avvisiamo tutti gli admin e superadmin (solo approvati)
        // Raccogliamo tutti gli utenti approvati e filtriamo in js per ruolo
        const snapUsers = await db.collection("users").where("status", "==", "approved").get();

        const tokensSet = new Set();
        snapUsers.forEach(doc => {
            const data = doc.data();
            // Invia se ha un token e se è amministratore
            if ((data.role === "admin" || data.role === "superadmin") && data.fcmToken) {
                tokensSet.add(data.fcmToken);
            }
        });

        // Convertiamo il Set unico in Array
        const tokens = Array.from(tokensSet);

        if (tokens.length > 0) {
            const response = await getMessaging().sendEachForMulticast({
                tokens: tokens,
                notification: payload.notification,
                data: payload.data,
                apns: payload.apns
            });
            console.log(`✅ Notifiche inviate: ${response.successCount}, Errori: ${response.failureCount}`);
        } else {
            console.log("⚠️ Nessun dispositivo admin/superadmin trovato per l'invio.");
        }

    } catch (error) {
        console.error("❌ Errore critico invio notifiche:", error);
    }

    return null;
});
