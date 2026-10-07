'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // This will only run on the client side, where localStorage is available.
    const consent = localStorage.getItem('cookie_consent');
    // The banner is only shown if the user has not made a choice yet.
    if (consent === null) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    window.dispatchEvent(new Event('cookie_consent_change'));
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'false');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-in-up">
      <Card className="container mx-auto max-w-4xl shadow-2xl rounded-3xl">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
          <p className="text-sm text-foreground/80">
            We use cookies to analyse site performance and ensure you get the best experience. For more details, see our{' '}
            <Link href="/privacy" className="underline hover:text-primary">
              Privacy Policy
            </Link>.
          </p>
          <div className="flex-shrink-0 flex items-center gap-4">
            <Button variant="outline" onClick={handleDecline}>
              Decline
            </Button>
            <Button onClick={handleAccept} className="bg-accent text-accent-foreground hover:bg-accent/90">Accept</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
