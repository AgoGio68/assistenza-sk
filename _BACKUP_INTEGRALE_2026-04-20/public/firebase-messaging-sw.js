importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

// Inizializza l'app Firebase nel ServiceWorker
firebase.initializeApp({
    apiKey: "AIzaSyD63d5jAcqa8bNkBUxM7FRK7oxeJbIjoXQ",
    authDomain: "assistenza-sk.firebaseapp.com",
    projectId: "assistenza-sk",
    storageBucket: "assistenza-sk.firebasestorage.app",
    messagingSenderId: "517535290337",
    appId: "1:517535290337:web:95471674a52d3a4ae878a0"
});

const messaging = firebase.messaging();

// Gestisce i messaggi in Arrivo ad app Chiusa o in Background
messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Notifica in background ricevuta.", payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: "/logo-sk.jpg",
        data: payload.data,
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        requireInteraction: true // Mantiene su schermo finché non ci si clicca (ove supportato)
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Aggiunge la logica per aprire lo shortcut cliccando sulla notifica di background
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            // Controlla se c'è già una finestra aperta, e focalizzala
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url.includes(event.notification.data.url) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Altrimenti, aprila
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url || '/admin');
            }
        })
    );
});
