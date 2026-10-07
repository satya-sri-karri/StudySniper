import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export function formatFirebaseError(err: any): string {
  if (!err) return 'An unknown error occurred.';
  const code = err.code || err.message || '';
  if (code.includes('auth/invalid-credential') || code.includes('auth/user-not-found') || code.includes('auth/wrong-password')) {
    return 'Invalid email or password in Firebase Authentication.';
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists in Firebase. Please sign in instead.';
  }
  if (code.includes('auth/weak-password')) {
    return 'Firebase requires a password of at least 6 characters.';
  }
  if (code.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('auth/unauthorized-domain')) {
    return 'Domain not authorized in Firebase Console. Please add this domain under Firebase > Authentication > Settings > Authorized Domains.';
  }
  if (code.includes('auth/operation-not-allowed')) {
    return 'Email/Password or Google provider is not enabled in Firebase Console > Authentication > Sign-in method.';
  }
  if (code.includes('auth/popup-blocked')) {
    return 'Google Sign-In popup was blocked by your browser. Please allow popups for this site.';
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return 'Google Sign-In popup was closed before completing authentication.';
  }
  return err.message || 'Firebase Authentication failed.';
}

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
};

