// Firebase configuration for SJVPS Record Book
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDJ2o4ITTYPSl0VFNqc9w20FLHgeRErB9Q",
  authDomain: "easyrecords-3487b.firebaseapp.com",
  projectId: "easyrecords-3487b",
  storageBucket: "easyrecords-3487b.firebasestorage.app",
  messagingSenderId: "757886160908",
  appId: "1:757886160908:web:8bc25bc02446e2dc5fde29",
  measurementId: "G-WR6QTJ103Z"
};

import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with multi-tab offline persistence for robust data retention
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const storage = getStorage(app);
export default app;
