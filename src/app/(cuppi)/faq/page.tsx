import { sanityClient } from '@/lib/sanity-client';
import { PortableText } from '@/components/portable-text';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import Link from 'next/link';
import Image from 'next/image';

export const revalidate = 60; // Re-fetch data every 60 seconds

type FaqItem = {
  _id: string;
  question: string;
  answer: any; // Portable Text
  category: string;
};

function formatCategoryTitle(slug: string): string {
    if (!slug) return '';
    return slug
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}

async function getFaqs() {
  const query = `*[_type == "faq"] | order(category asc, order asc) { _id, question, answer, category }`;
  const faqs = await sanityClient.fetch<FaqItem[]>(query);
  
  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    const category = faq.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {} as Record<string, FaqItem[]>);

  return groupedFaqs;
}

export default async function FaqPage() {
  const groupedFaqs = await getFaqs();

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="w-full flex flex-col items-center p-4 flex-grow">
        <div className="max-w-4xl mx-auto container px-4 pb-24 sm:pb-32 w-full">
          <h1 className="font-headline text-4xl sm:text-5xl font-bold mb-12 text-center">Frequently Asked Questions</h1>
          
          <div className="space-y-12">
            {Object.entries(groupedFaqs).map(([category, faqs]) => (
              <div key={category}>
                <h2 className="font-headline text-3xl font-bold mb-6">{formatCategoryTitle(category)}</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map(faq => (
                    <AccordionItem key={faq._id} value={faq._id}>
                      <AccordionTrigger className="text-lg text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="prose prose-lg dark:prose-invert max-w-none text-base">
                        <PortableText value={faq.answer} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
