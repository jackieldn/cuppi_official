import { initializeApp, getApps, App, cert, AppOptions } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { firebaseConfig } from './config';

const ADMIN_APP_NAME = "firebase-admin-app-for-studio-app"; // A unique name for the admin app

let firestore: ReturnType<typeof getFirestore>;
let auth: ReturnType<typeof getAuth>;
let storage: ReturnType<typeof getStorage>;

try {
  let app: App;
  const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);

  if (existingApp) {
    app = existingApp;
  } else {
    // When running on Google Cloud infrastructure (like App Hosting),
    // initializeApp() will automatically use the project's service account.
    // However, locally we might need to use a service account key if ADC is not available.

    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            // Sanitize private key if necessary (replace literal \n with actual newlines)
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            credential = cert(serviceAccount);
        } catch (e) {
            console.warn("Could not parse FIREBASE_SERVICE_ACCOUNT environment variable. Falling back to ADC.", e);
        }
    }

    // We only need to provide the storage bucket for the Storage service.
    // And projectId to ensure correct context.
    const options: AppOptions = {
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
    };

    if (credential) {
        options.credential = credential;
    }

    app = initializeApp(options, ADMIN_APP_NAME);
  }

  firestore = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);

} catch(e: any) {
  console.error("Firebase Admin SDK failed to initialize:", e.message);
  // To avoid crashing the server, we can assign dummy objects or handle it gracefully.
  // For now, let's re-throw but with a more informative message.
  throw new Error("Could not initialize Firebase Admin SDK. Server-side features will not work.");
}

export { firestore, auth, storage };
