import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function FaqHelpCta() {
  return (
    <section
      aria-labelledby="faq-help"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-2xl border bg-card p-6"
    >
      <div>
        <h2 id="faq-help" className="font-headline text-xl font-bold">
          Can’t find your answer?
        </h2>
        <p className="mt-1 text-muted-foreground">Message us and we aim to reply within 24–48 hours.</p>
      </div>
      <Button asChild>
        <Link href="/support">Contact support</Link>
      </Button>
    </section>
  );
}
