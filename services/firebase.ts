
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC5GgR5bnxt0-rWYy1_vLagj9lwE1NOR7w",
  authDomain: "elhenawy-lap.firebaseapp.com",
  projectId: "elhenawy-lap",
  storageBucket: "elhenawy-lap.firebasestorage.app",
  messagingSenderId: "980477385772",
  appId: "1:980477385772:web:e433ad35bd33954a7f8589",
  measurementId: "G-BLZ0EN96CQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const messaging = getMessaging(app);
const storage = getStorage(app);

// Initialize Firestore with persistent local cache enabled
const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

const requestPushPermission = async (vapidKey: string) => {
  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    return null;
  }

  return getToken(messaging, { vapidKey });
};

const listenToForegroundMessages = (callback: (payload: MessagePayload) => void) => {
  return onMessage(messaging, callback);
};

export { auth, db, messaging, storage, requestPushPermission, listenToForegroundMessages };
