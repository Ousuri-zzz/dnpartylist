import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_FIREBASE_API_KEY: string;
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
      NEXT_PUBLIC_FIREBASE_APP_ID: string;
      NEXT_PUBLIC_FIREBASE_DATABASE_URL: string;
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: string;
    }
  }
}

if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  throw new Error('Missing Firebase API Key');
}

if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
  throw new Error('Missing Firebase Database URL');
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Realtime Database
const database = getDatabase(app);
const authentication = getAuth(app);
const firestore = getFirestore(app);

// Log configuration for debugging (hiding sensitive data)
console.log('Firebase initialized with config:', {
  ...firebaseConfig,
  apiKey: '[HIDDEN]',
  appId: '[HIDDEN]',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
});

// Check if environment variables are set correctly
console.log('Environment variables check:');
console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_DATABASE_URL:', process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ? 'Set' : 'Not set');

// Check if database URL is correct
console.log('Database URL check:');
console.log('Expected URL format: https://[project-id]-default-rtdb.[region].firebasedatabase.app');
console.log('Actual URL:', process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);

export { database as db, authentication as auth, firestore }; 