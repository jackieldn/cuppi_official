import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { Button } from '@/components/ui/button';
import { APP_STORE_URL, inviteDeepLink } from '@/lib/invite';

// Where an invite link lands for anyone whose phone did not hand it straight to
// the Cuppi app: the app is not installed, or the link was opened on a desktop
// or in an in-app browser. With the app installed, iOS opens the link in the
// app before this page loads (universal links, see src/lib/aasa.ts).
export function InviteLanding({ token }: { token: string | null }) {
  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="w-full flex flex-col items-center p-4 pt-8 flex-grow">
        <div className="max-w-xl mx-auto w-full px-4 pb-24 text-center">
          {token ? (
            <>
              <h1 className="font-headline text-4xl font-bold mb-4">You&rsquo;ve been invited to a household</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Join on Cuppi to share the shopping list, pets, bins and everything else your household keeps on top of.
              </p>

              <div className="bg-card border rounded-2xl p-6 mb-6 text-left">
                <h2 className="font-headline text-xl font-bold mb-3">Already have Cuppi?</h2>
                <Button asChild size="lg" className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold">
                  <a href={inviteDeepLink(token)}>Open in Cuppi</a>
                </Button>
              </div>

              <div className="bg-card border rounded-2xl p-6 mb-6 text-left">
                <h2 className="font-headline text-xl font-bold mb-2">New to Cuppi?</h2>
                <p className="text-muted-foreground mb-4">
                  Download the app, then tap your invite link again, or choose &ldquo;Join a home&rdquo; and enter this invitation code:
                </p>
                <p className="font-mono text-lg bg-muted rounded-lg p-3 mb-4 break-all select-all text-center">{token}</p>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">Download on the App Store</a>
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-headline text-4xl font-bold mb-4">This invite link isn&rsquo;t valid</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Ask the person who invited you to send a new one, or open Cuppi and choose &ldquo;Join a home&rdquo; to enter the code by hand.
              </p>
              <Button asChild size="lg" variant="outline">
                <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">Get Cuppi</a>
              </Button>
            </>
          )}
        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
