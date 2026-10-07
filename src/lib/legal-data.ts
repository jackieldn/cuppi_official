import 'server-only';
import { firestore } from "@/firebase/server";
import { LegalDocument } from './about-types';
import { marked } from 'marked';

export async function getLegalDocument(slug: string): Promise<(LegalDocument & { htmlContent: string }) | null> {
    try {
      // The admin page uses the slug as the document ID
      const docRef = firestore.collection('legal_documents').doc(slug);
      const snapshot = await docRef.get();
      
      if (!snapshot.exists) {
        return null;
      }
      
      const data = snapshot.data() as LegalDocument;
      
      // Convert markdown content to HTML
      const htmlContent = await marked(data.content || '');

      return {
        ...data,
        id: snapshot.id,
        htmlContent,
      };

    } catch (error) {
      console.error(`Error fetching legal document with slug "${slug}" from Firestore:`, error);
      // In case of an error, return null to allow the page to show a "not found" state.
      return null;
    }
}
