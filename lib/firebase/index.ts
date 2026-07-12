/**
 * Firebase initialisation (JS SDK) — Auth + Firestore for Parent Mode.
 *
 * The web `apiKey` is a public project identifier, not a secret; real security
 * is enforced by Firestore security rules + Auth. Analytics is intentionally
 * omitted — it's web-only in this SDK and a COPPA no-go for a kids' app.
 *
 * Auth uses AsyncStorage persistence so a signed-in parent stays signed in, and
 * Firestore uses long-polling (the default WebChannel transport is flaky on
 * React Native).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  type Persistence,
  getAuth,
  initializeAuth,
} from 'firebase/auth';
import * as authModule from 'firebase/auth';
import {
  type Firestore,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB9YhhmGTzVNO1T5RrAeqMxvR09fJm5O0Y',
  authDomain: 'mathpen-6869d.firebaseapp.com',
  projectId: 'mathpen-6869d',
  storageBucket: 'mathpen-6869d.firebasestorage.app',
  messagingSenderId: '50496035047',
  appId: '1:50496035047:web:45ca4efbc0b48f91b36a42',
};

// `getReactNativePersistence` ships only in Firebase's React Native build (Metro
// resolves the `react-native` export condition at runtime) and is absent from
// the web type defs, so reach it through the module namespace.
const getReactNativePersistence = (
  authModule as unknown as {
    getReactNativePersistence: (storage: unknown) => Persistence;
  }
).getReactNativePersistence;

// Reuse an existing app across Fast Refresh re-executions.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// `initializeAuth` may only run once per app; on a hot-reload re-exec fall back
// to the already-initialised instance.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

// Same one-time guard for Firestore's long-polling init.
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch {
  dbInstance = getFirestore(app);
}

export const auth = authInstance;
export const db = dbInstance;
