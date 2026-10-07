import 'server-only';
import { firestore } from "@/firebase/server";

type HobbyImage = {
  id: string;
  imageUrl: string;
  createdAt: any;
  tags?: string[];
  order?: number;
  width: number;
  height: number;
};

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

export async function getHobbyImages(): Promise<HobbyImage[]> {
    try {
      const imagesCollection = firestore.collection('hobby_images');
      const q = imagesCollection.orderBy('createdAt', 'desc');
      const snapshot = await q.get();
      
      if (snapshot.empty) {
        return [];
      }
      
      const images = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as HobbyImage;
      });

      return serializeFirestoreTimestamps(images);
    } catch (error) {
      console.error("Error fetching hobby images from Firestore:", error);
      return [];
    }
}
