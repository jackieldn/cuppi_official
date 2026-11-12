'use client';

import { ActionButton } from '@/components/cuppi/action-button';
import { SupportForm } from '@/components/support/SupportForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/** The "Message us" button and the pop-up form. The only part of the support page that needs the browser. */
export function SupportMessage() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <ActionButton size="lg">Message us</ActionButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Send us a message</DialogTitle>
          <DialogDescription>Fill out the form below and we&apos;ll get back to you as soon as possible.</DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          <SupportForm />
        </div>
      </DialogContent>
    </Dialog>
  );
}
