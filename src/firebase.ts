import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyBiU8g45O1p7AeU--ZUszAcGz8af6EFygA",
    authDomain: "assistenza-sk-official.firebaseapp.com",
    projectId: "assistenza-sk-official",
    storageBucket: "assistenza-sk-official.firebasestorage.app",
    messagingSenderId: "666611116958",
    appId: "1:666611116958:web:ffe2e8497796a81ad4c48f"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Inizializza messaging solo se supportato dal browser corrente
export let messaging: any = null;
isSupported().then((supported) => {
    if (supported) {
        messaging = getMessaging(app);
    }
});
