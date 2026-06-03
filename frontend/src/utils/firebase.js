import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app
let messaging

export function initFirebase() {
  if (!firebaseConfig.apiKey || !firebaseConfig.appId) {
    console.warn('Firebase configuration is missing in environment variables. Push notifications are disabled.')
    return null
  }

  try {
    if (!app) {
      app = initializeApp(firebaseConfig)
      messaging = getMessaging(app)
    }
    return { app, messaging }
  } catch (error) {
    console.error('Failed to initialize Firebase SDK:', error)
    return null
  }
}

export async function requestNotificationPermissionAndGetToken() {
  const initialized = initFirebase()
  if (!initialized) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission not granted.')
      return null
    }

    // Build query params to register service worker dynamically with environment variables
    const configParams = new URLSearchParams({
      apiKey: firebaseConfig.apiKey || '',
      authDomain: firebaseConfig.authDomain || '',
      projectId: firebaseConfig.projectId || '',
      storageBucket: firebaseConfig.storageBucket || '',
      messagingSenderId: firebaseConfig.messagingSenderId || '',
      appId: firebaseConfig.appId || '',
    }).toString()

    const serviceWorkerUri = `/firebase-messaging-sw.js?${configParams}`

    // Register our service worker with dynamic environment params
    const registration = await navigator.serviceWorker.register(serviceWorkerUri)
    console.log('Firebase Service Worker registered successfully:', registration)

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    })

    return token
  } catch (error) {
    console.error('Error getting FCM push token:', error)
    return null
  }
}

export function onForegroundMessage(callback) {
  const initialized = initFirebase()
  if (!initialized || !messaging) return () => {}

  return onMessage(messaging, (payload) => {
    callback(payload)
  })
}
