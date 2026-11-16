import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from 'firebase/messaging';
import { app } from '../firebase';

const DEVICE_ID_STORAGE_KEY = 'radiotecnica_easy_fcm_device_id';
const FCM_SW_URL = '/firebase-messaging-sw.js';
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

export interface FcmRegistrationResult {
  status: 'granted' | 'denied' | 'default' | 'unsupported' | 'permission-only' | 'error';
  token?: string;
  deviceId: string;
  deviceLabel: string;
  timezone: string;
  message: string;
}

export function getOrCreateFcmDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }
    const generated = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `dev_${Date.now().toString(36)}`;
  }
}

export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Browser Web';
  const ua = navigator.userAgent;

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome|CriOS/i.test(ua)) browser = 'Chrome';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  let os = 'Web';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} · ${os}`.slice(0, 100);
}

export function getLocalTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof tz === 'string' && tz.trim().length > 0) {
      return tz.trim().slice(0, 64);
    }
  } catch {
    // Fallback
  }
  return 'Europe/Rome';
}

export async function checkFcmSupport(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    return await navigator.serviceWorker.register(FCM_SW_URL, {
      scope: FCM_SW_SCOPE,
    });
  } catch {
    return null;
  }
}

export async function requestFcmDeviceRegistration(): Promise<FcmRegistrationResult> {
  const deviceId = getOrCreateFcmDeviceId();
  const deviceLabel = getDeviceLabel();
  const timezone = getLocalTimezone();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      status: 'unsupported',
      deviceId,
      deviceLabel,
      timezone,
      message: 'Le notifiche push web non sono supportate in questo browser o riquadro.',
    };
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return {
      status: 'error',
      deviceId,
      deviceLabel,
      timezone,
      message: 'Impossibile richiedere il permesso notifiche al browser.',
    };
  }

  if (permission === 'denied') {
    return {
      status: 'denied',
      deviceId,
      deviceLabel,
      timezone,
      message:
        'Permesso notifiche bloccato nel browser. Sblocca le notifiche dalle impostazioni del sito oppure usa il calendario .ics.',
    };
  }

  if (permission !== 'granted') {
    return {
      status: 'default',
      deviceId,
      deviceLabel,
      timezone,
      message: 'Richiesta di autorizzazione chiusa senza conferma.',
    };
  }

  const supported = await checkFcmSupport();
  if (!supported) {
    return {
      status: 'permission-only',
      deviceId,
      deviceLabel,
      timezone,
      message:
        'Notifiche locali autorizzate; Push FCM in background non supportate in questo ambiente.',
    };
  }

  const registration = await registerFcmServiceWorker();
  if (!registration) {
    return {
      status: 'permission-only',
      deviceId,
      deviceLabel,
      timezone,
      message:
        'Permesso notifiche concesso, ma registrazione Service Worker FCM non disponibile in questa finestra.',
    };
  }

  try {
    const messaging = getMessaging(app);
    const envVapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim();
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      ...(envVapidKey ? { vapidKey: envVapidKey } : {}),
    });

    if (token && token.length >= 20) {
      return {
        status: 'granted',
        token,
        deviceId,
        deviceLabel,
        timezone,
        message: 'Dispositivo registrato su Firebase Cloud Messaging (FCM)!',
      };
    }
    return {
      status: 'permission-only',
      deviceId,
      deviceLabel,
      timezone,
      message:
        'Permesso browser attivo. Per il token push FCM in background configura VITE_FIREBASE_VAPID_KEY dalla console Firebase.',
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const missingVapid =
      detail.toLowerCase().includes('vapid') ||
      detail.toLowerCase().includes('applicationserverkey') ||
      detail.toLowerCase().includes('missing');
    return {
      status: 'permission-only',
      deviceId,
      deviceLabel,
      timezone,
      message: missingVapid
        ? 'Notifiche browser attive. Per generare il token FCM in background aggiungi la chiave pubblica Web Push (VITE_FIREBASE_VAPID_KEY).'
        : `Notifiche browser attive (token FCM non generato in questo contesto: ${detail}).`,
    };
  }
}

export async function revokeFcmTokenOnDevice(): Promise<void> {
  try {
    const supported = await checkFcmSupport();
    if (!supported) return;
    const messaging = getMessaging(app);
    await deleteToken(messaging);
  } catch {
    // Ignore delete errors if token wasn't initialized on this browser
  }
}

export async function subscribeForegroundFcm(
  onPayload: (payload: MessagePayload) => void
): Promise<(() => void) | null> {
  try {
    const supported = await checkFcmSupport();
    if (!supported) return null;
    const messaging = getMessaging(app);
    return onMessage(messaging, onPayload);
  } catch {
    return null;
  }
}

export async function showBrowserOrSwNotification(
  title: string,
  body: string,
  url = '/'
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const fcmReg = await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE);
      const reg = fcmReg || (await navigator.serviceWorker.getRegistration());
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'radiotecnica-study-reminder',
          data: { url },
        });
        return true;
      }
    }
  } catch {
    // Fall back to standard Notification API
  }

  try {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
    });
    return true;
  } catch {
    return false;
  }
}
