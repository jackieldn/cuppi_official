'use client';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

/**
* Initializes and returns Firebase services for the client.
* This function ensures that Firebase is initialized only once.
*/
export function initializeFirebase() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-fetch-collection';
export * from './firestore/use-doc';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export * from './non-blocking-updates';
