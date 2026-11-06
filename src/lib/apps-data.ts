import 'server-only';
import { firestore } from "@/firebase/server";
import { normalizeApp, sortApps, type App } from './showcase';

function serializeFirestoreTimestamps(data: any): any {
    if (data === null || data === undefined) {
        return data;
    }
    if (typeof data.toDate === 'function') { // Firestore Timestamp check
        return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(serializeFirestoreTimestamps);
    }
    if (typeof data === 'object') {
        const newObj: { [key: string]: any } = {};
        for (const key in data) {
            newObj[key] = serializeFirestoreTimestamps(data[key]);
        }
        return newObj;
    }
    return data;
}


export async function getApps(): Promise<App[]> {
    try {
      const snapshot = await firestore.collection('apps').get();

      if (snapshot.empty) {
        return [];
      }

      const apps = snapshot.docs.map(doc =>
        normalizeApp({ id: doc.id, ...serializeFirestoreTimestamps(doc.data()) })
      );

      return sortApps(apps);
    } catch (error) {
      console.error("Error fetching apps from Firestore:", error);
      // In case of an error, return an empty array to prevent build/render failures.
      return [];
    }
}
