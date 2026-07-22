// Fix: Use Firebase v8 namespaced imports.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/database';

// Your web app's Firebase configuration - provided in the prompt
const firebaseConfig = {
    apiKey: "AIzaSyDtq1vLVZ9D3CBis6FFSpt8psERGyTG6YM",
    authDomain: "gen-z-airdrop.firebaseapp.com",
    databaseURL: "https://gen-z-airdrop-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "gen-z-airdrop",
    storageBucket: "gen-z-airdrop.firebasestorage.app",
    messagingSenderId: "1056087088959",
    appId: "1:1056087088959:web:2d15418429c2f378f2bd8a",
    measurementId: "G-CKB3HP9D31"
};

// Fix: Use Firebase v8 initialization.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Fix: Export v8 service instances.
export const auth = firebase.auth();
export const rtdb = firebase.database();

// Try to use 'local' persistence to keep the user signed in across browser sessions.
// This addresses the issue of being logged out when closing a tab.
// If 'local' is not available (e.g., in sandboxed iframes or with cookies disabled),
// it will fall back to 'session' persistence.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => {
    // This can happen in environments where localStorage is disabled.
    console.warn(`Could not set 'local' auth persistence: ${error.message}. Falling back to 'session'.`);
    return auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
  })
  .catch((error) => {
    // This could happen if even session storage is disabled.
    // In that case, auth state will be in-memory only.
    console.error("Could not set auth persistence:", error.message);
  });