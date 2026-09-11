importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC5GgR5bnxt0-rWYy1_vLagj9lwE1NOR7w",
  authDomain: "elhenawy-lap.firebaseapp.com",
  projectId: "elhenawy-lap",
  storageBucket: "elhenawy-lap.firebasestorage.app",
  messagingSenderId: "980477385772",
  appId: "1:980477385772:web:e433ad35bd33954a7f8589",
  measurementId: "G-BLZ0EN96CQ"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || payload.data?.title || 'New notification';
  const options = {
    body: notification.body || payload.data?.message || payload.data?.body || '',
    icon: notification.icon || payload.data?.icon || '/vite.svg',
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});
