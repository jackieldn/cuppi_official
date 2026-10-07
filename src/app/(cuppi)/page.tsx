import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { CuppiHomePage } from '@/components/cuppi/home-page-client';
import { WhatsNew } from '@/components/cuppi/whats-new';

export default function CuppiPage() {
  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="flex-grow w-full flex flex-col items-center p-4">
        <CuppiHomePage>
            <WhatsNew />
        </CuppiHomePage>
      </main>
      <CuppiFooter />
    </div>
  );
}
