'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TotpMultiFactorGenerator,
  getMultiFactorResolver,
  multiFactor,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  type MultiFactorError,
  type MultiFactorResolver,
  type TotpSecret,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AUTHENTICATOR_ISSUER, authErrorMessage, cleanCode, groupSecret, hasSecondFactor } from '@/lib/admin-mfa';

// Signing in to the admin takes two steps: the password, then a six-digit code from an
// authenticator app. An admin who has not set the app up yet is walked through it here, the
// first time they sign in. See src/lib/admin-mfa.ts and the README ("Admin sign-in").
type Step = 'password' | 'code' | 'enroll' | 'verify-email';

type Enrollment = { secret: TotpSecret; qr: string };

const NOT_ALLOWED = authErrorMessage(undefined);

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  const [step, setStep] = useState<Step>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  // The password-only session being walked through setting up (or verifying an email for).
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // True while this page is in the middle of signing someone in, so the effect below does
  // not mistake a password-only session (which the sign-in itself creates) for a stale one.
  const inFlow = useRef(false);

  // Someone who opens this page already signed in either has a full sign-in (go to the
  // dashboard) or a password-only leftover (sign out, so nothing half-signed-in lingers).
  useEffect(() => {
    if (isUserLoading || !user || inFlow.current) return;
    let cancelled = false;
    user
      .getIdTokenResult()
      .then((token) => {
        if (cancelled || inFlow.current) return;
        if (hasSecondFactor(token.claims)) router.replace('/admin');
        else void signOut(auth);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, isUserLoading, auth, router]);

  /** Back to the password step, signed out, optionally with a note or an error to show there. */
  const reset = async (shown: { notice?: string; error?: string } = {}) => {
    inFlow.current = false;
    setResolver(null);
    setEnrollment(null);
    setPendingUser(null);
    setPassword('');
    setCode('');
    setError(shown.error ?? null);
    setNotice(shown.notice ?? null);
    setStep('password');
    await signOut(auth).catch(() => undefined);
  };

  /** Only a real admin may set up two-step verification; anyone else is signed straight back out. */
  const isAdmin = async (signedIn: User) => {
    try {
      return (await getDoc(doc(firestore, 'roles_admin', signedIn.uid))).exists();
    } catch {
      return false;
    }
  };

  const startEnrollment = async (signedIn: User) => {
    setPendingUser(signedIn);
    try {
      const session = await multiFactor(signedIn).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);
      const uri = secret.generateQrCodeUrl(signedIn.email ?? 'admin', AUTHENTICATOR_ISSUER);
      const { toDataURL } = await import('qrcode');
      const qr = await toDataURL(uri, { margin: 1, width: 224 });
      setEnrollment({ secret, qr });
      setStep('enroll');
    } catch (e) {
      const errCode = (e as { code?: string }).code;
      if (errCode === 'auth/unverified-email') setStep('verify-email');
      else await reset({ error: authErrorMessage(errCode) });
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    inFlow.current = true;
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Signed in with a password alone. That is only the first step: an admin who has not
      // set up an authenticator app yet does so now; anyone else is turned away.
      if (!(await isAdmin(credential.user))) {
        await reset({ error: NOT_ALLOWED });
      } else if (hasSecondFactor((await credential.user.getIdTokenResult()).claims)) {
        inFlow.current = false;
        router.replace('/admin');
      } else {
        await startEnrollment(credential.user);
      }
    } catch (err) {
      if ((err as { code?: string }).code === 'auth/multi-factor-auth-required') {
        setResolver(getMultiFactorResolver(auth, err as MultiFactorError));
        setCode('');
        setStep('code');
      } else {
        inFlow.current = false;
        setError(authErrorMessage((err as { code?: string }).code));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !resolver) return;
    const digits = cleanCode(code);
    if (!digits) {
      setError('Enter the six-digit code from your authenticator app.');
      return;
    }
    const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!hint) {
      await reset({ error: NOT_ALLOWED });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, digits));
      inFlow.current = false;
      router.replace('/admin');
    } catch (err) {
      const errCode = (err as { code?: string }).code;
      // A timed-out or throttled sign-in cannot be retried with the same session.
      if (errCode === 'auth/code-expired' || errCode === 'auth/too-many-requests' || errCode === 'auth/invalid-multi-factor-session') {
        await reset({ error: authErrorMessage(errCode) });
      } else {
        setError(authErrorMessage(errCode));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !enrollment || !pendingUser) return;
    const digits = cleanCode(code);
    if (!digits) {
      setError('Enter the six-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await multiFactor(pendingUser).enroll(
        TotpMultiFactorGenerator.assertionForEnrollment(enrollment.secret, digits),
        'Authenticator app',
      );
      // This session was started without the code, so it cannot act as an admin. Sign in
      // again, this time with it.
      await reset({ notice: 'Authenticator added. Sign in again, then enter the code from the app.' });
    } catch (err) {
      setError(authErrorMessage((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  };

  const handleSendVerification = async () => {
    if (busy || !pendingUser) return;
    setBusy(true);
    setError(null);
    try {
      await sendEmailVerification(pendingUser);
      await reset({ notice: 'Verification email sent. Open the link in it, then sign in again.' });
    } catch (err) {
      setError(authErrorMessage((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  };

  const errorBlock = error ? (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  ) : null;

  const codeField = (
    <div className="space-y-2">
      <Label htmlFor="code">Six-digit code</Label>
      <Input
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={12}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoFocus
        required
      />
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Admin Login</CardTitle>
          <CardDescription>
            {step === 'password' && 'Enter your credentials to access the dashboard.'}
            {step === 'code' && 'Enter the code from your authenticator app.'}
            {step === 'enroll' && 'Set up two-step verification before you continue.'}
            {step === 'verify-email' && 'Your email address needs verifying before two-step verification can be set up.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'password' && (
            <form onSubmit={handlePassword} className="space-y-4">
              {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {errorBlock}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleCode} className="space-y-4">
              {codeField}
              {errorBlock}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Checking…' : 'Verify'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => void reset()} disabled={busy}>
                Back
              </Button>
            </form>
          )}

          {step === 'enroll' && enrollment && (
            <form onSubmit={handleEnroll} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan this with an authenticator app (1Password, Google Authenticator, Authy…), then type the code it shows.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollment.qr} alt="QR code for your authenticator app" width={224} height={224} className="mx-auto rounded-md bg-white" />
              <p className="text-center text-xs text-muted-foreground">
                Cannot scan it? Enter this key instead:
                <br />
                <code className="select-all break-all font-mono text-sm text-foreground">{groupSecret(enrollment.secret.secretKey)}</code>
              </p>
              {codeField}
              {errorBlock}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Checking…' : 'Turn on two-step verification'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => void reset()} disabled={busy}>
                Cancel
              </Button>
            </form>
          )}

          {step === 'verify-email' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We can send a verification link to the address on this account. Open it, then sign in again.
              </p>
              {errorBlock}
              <Button type="button" className="w-full" onClick={() => void handleSendVerification()} disabled={busy}>
                {busy ? 'Sending…' : 'Send verification email'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => void reset()} disabled={busy}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
