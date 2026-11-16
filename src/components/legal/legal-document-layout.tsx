import Image from 'next/image';
import Link from 'next/link';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';

interface LegalDocumentLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function LegalDocumentLayout({ title, children }: LegalDocumentLayoutProps) {
  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
        <CuppiHeader />
        <main className="w-full flex flex-col items-center px-4 pb-4 flex-grow">
            {/* The title sits the same distance under the menu as The Cosy Corner's (pt-14, pt-20 from sm up). */}
            <article className="max-w-4xl mx-auto container px-4 pt-14 sm:pt-20 pb-24 sm:pb-32">
                <h1 className="font-headline text-4xl sm:text-5xl font-bold mb-12 text-center">{title}</h1>
                <div className="legal-content text-lg leading-relaxed text-foreground/90">
                  {children}
                </div>
            </article>
        </main>
        <CuppiFooter />
    </div>
  );
}
