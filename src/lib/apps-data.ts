import 'server-only';
import { firestore } from "@/firebase/server";
import { App } from './about-types';

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
      const appsCollection = firestore.collection('apps');
      const q = appsCollection.orderBy('releaseDate', 'desc');
      const snapshot = await q.get();
      
      if (snapshot.empty) {
        return [];
      }
      
      const apps = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as App;
      });

      return serializeFirestoreTimestamps(apps);
    } catch (error) {
      console.error("Error fetching apps from Firestore:", error);
      // In case of an error, return an empty array to prevent build/render failures.
      return [];
    }
}
