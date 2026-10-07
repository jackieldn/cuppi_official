'use client';

import { useState, useEffect } from 'react';
import { useAuth, initiateEmailSignIn, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // If user is loaded and exists, redirect to admin dashboard.
    if (!isUserLoading && user) {
      toast({
        title: "Signed in",
        description: "Redirecting to dashboard...",
      });
      router.push('/admin');
    }
  }, [user, isUserLoading, router, toast]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // Non-blocking sign-in. The useEffect hook will handle the redirect.
    initiateEmailSignIn(auth, email, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Admin Login</CardTitle>
          <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
