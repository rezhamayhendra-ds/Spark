importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAmjseAtdgkh4jH2L_aHYcp7TC4WlPumtU",
  authDomain: "gen-lang-client-0884869761.firebaseapp.com",
  projectId: "gen-lang-client-0884869761",
  storageBucket: "gen-lang-client-0884869761.firebasestorage.app",
  messagingSenderId: "253616874753",
  appId: "1:253616874753:web:fcc2699e362b49ae77a700"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/spark-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
