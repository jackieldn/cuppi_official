import 'server-only';
import { firestore } from "@/firebase/server";
import { Project } from './projects';

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

export async function getProjects(): Promise<Project[]> {
    try {
      const projectsCollection = firestore.collection('projects');
      const q = projectsCollection.orderBy('title');
      const snapshot = await q.get();
      
      if (snapshot.empty) {
        return [];
      }
      
      const projects = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as Project;
      });

      return serializeFirestoreTimestamps(projects);
    } catch (error) {
      console.error("Error fetching projects from Firestore:", error);
      return [];
    }
}
