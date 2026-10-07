'use client';

import { KnowledgeAdmin } from '@/components/admin/chatbot/knowledge-admin';

export default function ChatbotAdminPage() {
  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <h1 className="font-headline text-4xl font-bold">Manage Chatbot Knowledge</h1>
      
      <section>
        <KnowledgeAdmin />
      </section>
    </div>
  );
}
