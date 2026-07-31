const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const axios = require("axios");

initializeApp();
const db = getFirestore();

const TELEGRAM_TOKEN = "8964452322:AAHo9R3Wjr0vB77hqz_a9wvyxPgBij_gLOA";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

/**
 * Helper to send a message via Telegram
 */
async function sendTelegramMessage(text) {
    try {
        // Read active Telegram subscribers
        const subscribersSnap = await db.collection("notifiche_telegram")
            .where("attivo", "==", true)
            .get();

        if (subscribersSnap.empty) {
            console.log("No active Telegram subscribers found.");
            return;
        }

        const promises = subscribersSnap.docs.map(doc => {
            const { chatId } = doc.data();
            return axios.post(TELEGRAM_API, {
                chat_id: chatId,
                text: text,
                parse_mode: "HTML"
            }).catch(err => {
                console.error(`Error sending to ${chatId}:`, err.response?.data || err.message);
            });
        });

        await Promise.all(promises);
    } catch (error) {
        console.error("Error in sendTelegramMessage:", error);
    }
}

/**
 * Trigger on Ticket Created
 */
exports.onTicketCreated = onDocumentCreated("tickets/{ticketId}", async (event) => {
    const data = event.data.data();
    const ticketId = event.params.ticketId;

    const text = `<b>🎫 NUOVO TICKET #${ticketId.substring(0, 6)}</b>\n\n` +
                 `<b>Cliente:</b> ${data.companyName}\n` +
                 `<b>Oggetto:</b> ${data.description}\n` +
                 `<b>Urgenza:</b> ${data.urgency === 'urgente' ? '🔴 URGENTE' : '🟢 NORMALE'}\n` +
                 `<b>Creato da:</b> ${data.creatorName || 'N/D'}`;

    await sendTelegramMessage(text);
});

/**
 * Trigger on Installation Created
 */
exports.onInstallationCreated = onDocumentCreated("installation_data/{instId}", async (event) => {
    const data = event.data.data();
    
    // Solo se è manuale o se è una nuova assegnazione (se ha client/machine)
    const client = data.client || (data.localOverrides && data.localOverrides.client);
    const machine = data.machine || (data.localOverrides && data.localOverrides.machine);
    
    if (!client && !machine) return;

    const text = `<b>🚚 NUOVA INSTALLAZIONE</b>\n\n` +
                 `<b>Cliente:</b> ${client || 'N/D'}\n` +
                 `<b>Macchina:</b> ${machine || 'N/D'}\n` +
                 `<b>Sezione:</b> ${data.section || 'SK'}\n` +
                 `<b>Note:</b> ${data.comments || 'Nessuna'}`;

    await sendTelegramMessage(text);
});

// Ver 27.0.1 - TELEGRAM ENGINE
