'use client';

import { CuppiHeader } from '@/components/cuppi/header';
import { CuppiFooter } from '@/components/cuppi/footer';
import { SupportForm } from '@/components/support/SupportForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="w-full flex flex-col items-center p-4 pt-8 flex-grow">
        <div className="max-w-4xl mx-auto container px-4 pb-24 sm:pb-32 w-full">
          <div className="text-center">
            <h1 className="font-headline text-4xl sm:text-5xl font-bold mb-4">Support</h1>
            <p className="text-lg text-muted-foreground mb-12">
              We’re here to help you keep your household running smoothly.
            </p>
          </div>
          
          <div className="bg-card border rounded-2xl p-8 mb-12 text-center">
            <h2 className="font-headline text-2xl font-bold">Contact Us</h2>
            <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
              For technical help, feature requests, or security inquiries. We aim to respond to all inquiries within 24–48 hours.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" className="mt-6">Message us</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Send us a message</DialogTitle>
                  <DialogDescription>
                    Fill out the form below and we'll get back to you as soon as possible.
                  </DialogDescription>
                </DialogHeader>
                <div className="pt-4">
                  <SupportForm />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-10 text-left">
            <section>
              <h2 className="font-headline text-2xl font-bold">Subscriptions & Billing</h2>
              <div className="mt-4 space-y-4 text-foreground/80">
                <p>All Cuppi Pro payments are securely handled by Apple.</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong>To cancel or change a subscription:</strong> Open the Settings app on your iPhone &gt; Tap your Name &gt; Tap Subscriptions.
                  </li>
                  <li>
                    <strong>Refunds:</strong> These must be requested directly through <a href="https://reportaproblem.apple.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">reportaproblem.apple.com</a>.
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="font-headline text-2xl font-bold">Privacy & Safety</h2>
              <div className="mt-4 space-y-4 text-foreground/80">
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong>Account Deletion:</strong> You can delete your account and all associated data via the Profile Settings in the Cuppi app.
                  </li>
                  <li>
                    <strong>Data Rights:</strong> To exercise your right to access or erasure (GDPR), please email us with the subject line "Data Request" or go to your Profile and tap on "Request My Data". A download link will appear within 24 hours to download your data for the next 7 days.
                  </li>
                </ul>
              </div>
            </section>
            
            <p className="text-foreground/80">
              Please visit the <Link href="/faq" className="underline hover:text-primary">FAQ page</Link> for frequently asked questions and answers for the most common issues.
            </p>
          </div>
          
          <div className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
             <p>Cuppi and JackiePoot Creations is a trading name of Jack Ward. ICO Registered: ZC129317</p>
          </div>

        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
