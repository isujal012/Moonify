import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCi2jG4z0M_3A4Q_sokk8m1VVbEEgnKp5w",
  authDomain: "moonify-8e6eb.firebaseapp.com",
  projectId: "moonify-8e6eb",
  storageBucket: "moonify-8e6eb.firebasestorage.app",
  messagingSenderId: "16409978311",
  appId: "1:16409978311:web:ffeb3baee8f39de38ae5e2",
  measurementId: "G-000XPFC3CJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
