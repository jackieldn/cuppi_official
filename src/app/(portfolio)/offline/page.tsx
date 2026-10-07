import type { Metadata } from 'next';

// Shown on jackiepoot.co.uk while PORTFOLIO_ENABLED=false (see src/lib/sites.ts).
export const metadata: Metadata = {
  title: 'Back soon',
  robots: { index: false, follow: false },
};

export default function PortfolioOfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Back soon</h1>
        <p className="text-muted-foreground">This portfolio is taking a break.</p>
      </div>
    </main>
  );
}
