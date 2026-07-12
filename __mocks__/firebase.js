/**
 * Jest mock for the Firebase JS SDK (firebase/app | auth | firestore).
 *
 * Tests never exercise real Firebase behaviour — this just lets modules that
 * import the SDK load without pulling the real ESM build (which jest can't
 * parse) or touching the network. Mapped in jest.config.js for those subpaths.
 */
const app = {};
const noopUnsub = () => {};

module.exports = {
  // firebase/app
  initializeApp: () => app,
  getApp: () => app,
  getApps: () => [app],

  // firebase/auth
  initializeAuth: () => ({ currentUser: null }),
  getAuth: () => ({ currentUser: null }),
  getReactNativePersistence: () => ({}),
  onAuthStateChanged: () => noopUnsub,
  signInAnonymously: async () => ({ user: { uid: 'test-uid' } }),
  signInWithEmailAndPassword: async () => ({ user: { uid: 'test-uid' } }),
  createUserWithEmailAndPassword: async () => ({ user: { uid: 'test-uid' } }),
  signOut: async () => {},

  // firebase/firestore
  getFirestore: () => ({}),
  initializeFirestore: () => ({}),
  doc: () => ({}),
  collection: () => ({}),
  query: () => ({}),
  where: () => ({}),
  limit: () => ({}),
  setDoc: async () => {},
  addDoc: async () => ({ id: 'test-id' }),
  getDoc: async () => ({ exists: () => false, data: () => undefined }),
  getDocs: async () => ({ docs: [] }),
  onSnapshot: () => noopUnsub,
  serverTimestamp: () => ({}),
};
