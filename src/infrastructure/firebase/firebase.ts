/**
 * [LAYER: INFRASTRUCTURE]
 * Firebase & Firestore Initialization
 * 
 * Includes robust fallbacks for production environment variables.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  enableNetwork,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
  type FirestoreSettings,
} from 'firebase/firestore';
import { getAuth as getAuthSDK } from 'firebase/auth';
import { getStorage as getStorageSDK } from 'firebase/storage';
import { getAnalytics as getAnalyticsSDK, type Analytics } from 'firebase/analytics';
import { logger } from '@utils/logger';

// Production constants for robust fallback
const PROD_CONFIG = {
  apiKey: "AIzaSyBSIoYc0zsnci210iK2fEr7znVPygpcoQ0",
  authDomain: "woodbine-8c8ee.firebaseapp.com",
  projectId: "woodbine-8c8ee",
  storageBucket: "woodbine-8c8ee.firebasestorage.app",
  messagingSenderId: "1054896128542",
  appId: "1:1054896128542:web:0b38f2320cda52d4f1a40f",
  measurementId: "G-3XGFTPTB52",
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || PROD_CONFIG.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || PROD_CONFIG.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || PROD_CONFIG.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || PROD_CONFIG.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || PROD_CONFIG.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || PROD_CONFIG.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || PROD_CONFIG.measurementId,
};

// Internal lazy instances
let _app: FirebaseApp | undefined;
let _db: Firestore | undefined;
let _auth: ReturnType<typeof getAuthSDK> | undefined;
let _storage: ReturnType<typeof getStorageSDK> | undefined;
let _analytics: Analytics | undefined;
let networkRecoveryInstalled = false;
let networkRecoveryTimer: ReturnType<typeof setTimeout> | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return _app;
}

function createBrowserFirestoreSettings(localCache: FirestoreSettings['localCache']): FirestoreSettings {
  return {
    ignoreUndefinedProperties: true,
    experimentalAutoDetectLongPolling: true,
    localCache,
  };
}

function createFirestoreSettings(): FirestoreSettings {
  if (typeof window === 'undefined') {
    return {
      ignoreUndefinedProperties: true,
      localCache: memoryLocalCache(),
    };
  }

  return createBrowserFirestoreSettings(
    persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    })
  );
}

function createBrowserMemoryFallbackSettings(): FirestoreSettings {
  return createBrowserFirestoreSettings(memoryLocalCache());
}

function scheduleNetworkRecovery(reason: string): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  if (networkRecoveryTimer) clearTimeout(networkRecoveryTimer);
  networkRecoveryTimer = setTimeout(() => {
    enableNetwork(getDb()).catch((error: any) => {
      logger.warn('Firestore network recovery attempt failed', {
        reason,
        code: error?.code,
        message: error?.message,
      });
    });
  }, 250);
}

function installFirestoreNetworkRecovery(): void {
  if (typeof window === 'undefined' || networkRecoveryInstalled) return;
  networkRecoveryInstalled = true;

  window.addEventListener('online', () => scheduleNetworkRecovery('online'));
  window.addEventListener('focus', () => scheduleNetworkRecovery('focus'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      scheduleNetworkRecovery('visibilitychange');
    }
  });
}

export function getDb(): Firestore {
  if (!_db) {
    const app = getFirebaseApp();
    try {
      _db = initializeFirestore(app, createFirestoreSettings());
    } catch (error: any) {
      try {
        _db = initializeFirestore(app, createBrowserMemoryFallbackSettings());
        logger.warn('Firestore persistent cache unavailable; using memory cache fallback', {
          code: error?.code,
          message: error?.message,
        });
      } catch (fallbackError: any) {
        _db = getFirestore(app);
        logger.warn('Reusing existing Firestore instance after initialization race', {
          code: fallbackError?.code || error?.code,
          message: fallbackError?.message || error?.message,
        });
      }
    }
    installFirestoreNetworkRecovery();
  }
  return _db;
}

export function getAuth() {
  if (!_auth) _auth = getAuthSDK(getFirebaseApp());
  return _auth;
}

export function getStorage() {
  if (!_storage) _storage = getStorageSDK(getFirebaseApp());
  return _storage;
}

export function getAnalytics() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Analytics is only available in the browser.');
  }
  if (!_analytics) _analytics = getAnalyticsSDK(getFirebaseApp());
  return _analytics;
}

// We don't export constants here anymore to avoid eager initialization in the browser.
// All consumers should use getDb(), getAuth(), getStorage(), and getAnalytics().

export { getFirebaseApp as app };
