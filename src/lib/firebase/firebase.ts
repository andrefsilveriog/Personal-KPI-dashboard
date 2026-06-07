import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

type FirebaseClient = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let client: FirebaseClient | null = null;

export function getFirebaseClient(): FirebaseClient | null {
  if (!firebaseConfig.success) {
    return null;
  }

  if (!client) {
    const app = initializeApp(firebaseConfig.data);
    client = {
      app,
      auth: getAuth(app),
      db: getFirestore(app)
    };
  }

  return client;
}
