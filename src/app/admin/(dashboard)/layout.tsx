'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { AdminSidebar } from '@/components/admin/sidebar';
import { FirestorePermissionError, errorEmitter } from '@/firebase';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // This effect handles authentication and authorization for all admin routes.
  useEffect(() => {
    // If auth state is still loading, do nothing yet.
    if (isUserLoading) {
      return;
    }

    // If not logged in, redirect to the login page.
    if (!user) {
      router.push('/admin/login');
      return;
    }

    // If user is logged in, check if they are an admin.
    if (user && firestore) {
      const checkAdmin = async () => {
        setIsCheckingAdmin(true);
        const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
        try {
          const docSnap = await getDoc(adminRoleRef);
          if (docSnap.exists()) {
            setIsAdmin(true); // User is an admin.
          } else {
            // User is authenticated but not an admin, redirect.
            // You might want to show an "access denied" page instead.
            router.push('/admin/login');
          }
        } catch (error) {
            const contextualError = new FirestorePermissionError({
                operation: 'get',
                path: adminRoleRef.path,
            });
            errorEmitter.emit('permission-error', contextualError);
            router.push('/admin/login'); // Assume not admin and redirect on error
        } finally {
            setIsCheckingAdmin(false);
        }
      };
      checkAdmin();
    }
  }, [user, isUserLoading, router, firestore]);

  const handleSignOut = async () => {
    if (auth) {
        await auth.signOut();
    }
    // The useEffect hook will catch the user change and redirect to login.
  };

  // While checking auth/admin status, show a loading screen.
  if (isUserLoading || isCheckingAdmin || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // If user is an admin, render the dashboard layout.
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
             <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="">Admin Panel</span>
            </Link>
          </div>
          <div className="flex-1 py-4">
            <AdminSidebar />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          {/* Mobile Navigation can be added here if needed */}
          <div className="w-full flex-1">
            {/* Search or other header elements can go here */}
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            Sign Out
          </Button>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
        </main>
      </div>
    </div>
  );
}
