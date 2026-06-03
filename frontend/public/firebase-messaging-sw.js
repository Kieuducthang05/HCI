/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js')

self.addEventListener('install', () => {
  self.skipWaiting()
})

const params = new URLSearchParams(location.search)

const firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
}

// Only initialize if we have the config fields
if (firebaseConfig.apiKey && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received: ', payload)

    const notificationTitle = payload.notification?.title || 'Cảnh báo HMI'
    const notificationOptions = {
      body: payload.notification?.body || 'Có thông tin cảnh báo mới từ con của bạn.',
      icon: '/logo192.png',
      data: payload.data,
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
  })
} else {
  console.warn('[firebase-messaging-sw.js] Firebase config is missing query parameters. Background messaging not initialized.')
}
