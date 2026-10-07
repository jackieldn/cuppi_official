'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { firebaseConfig } from '@/firebase/config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    const initializeAnalyticsWithConsent = () => {
      // Ensure we are on the client and consent has been given
      if (typeof window === 'undefined' || localStorage.getItem('cookie_consent') !== 'true') {
        return;
      }
      
      if (firebaseServices.firebaseApp) {
        isSupported().then(supported => {
          if (supported) {
            // This is the user's fix, which we are preserving.
            if (!(window as any)._firebaseFetchPatched) {
              const originalFetch = window.fetch;
              (window as any)._firebaseFetchPatched = true;

              const patchedFetch = async (...args: any[]) => {
                const [input] = args;
                let url: string | undefined;

                if (typeof input === 'string') {
                  url = input;
                } else if (input instanceof URL) {
                  url = input.toString();
                } else if (input && typeof input === 'object' && 'url' in input) {
                  url = (input as any).url;
                }

                if (
                  url &&
                  url.includes('firebase.googleapis.com') &&
                  url.includes('webConfig') &&
                  url.includes(firebaseConfig.appId)
                ) {
                  return new Response(
                    JSON.stringify({
                      measurementId: firebaseConfig.measurementId,
                      appId: firebaseConfig.appId,
                    }),
                    {
                      status: 200,
                      headers: { 'Content-Type': 'application/json' },
                    }
                  );
                }
                return originalFetch.apply(window, args);
              };

              try {
                Object.defineProperty(window, 'fetch', {
                  value: patchedFetch,
                  configurable: true,
                  writable: true,
                });
              } catch (e) {
                console.error('Failed to patch window.fetch via defineProperty:', e);
                // Last ditch effort: try direct assignment if defineProperty failed
                // (though unlikely to work if defineProperty failed)
                try {
                  (window as any).fetch = patchedFetch;
                } catch (assignError) {
                  console.error('Failed to patch window.fetch via assignment:', assignError);
                }
              }
            }

            setAnalytics(getAnalytics(firebaseServices.firebaseApp));
          }
        });
      }
    };
    
    // Initialize on mount if consent is already given
    initializeAnalyticsWithConsent();

    // Listen for the custom event dispatched by the cookie banner
    window.addEventListener('cookie_consent_change', initializeAnalyticsWithConsent);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('cookie_consent_change', initializeAnalyticsWithConsent);
    };

  }, [firebaseServices.firebaseApp]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
      analytics={analytics}
    >
      {children}
    </FirebaseProvider>
  );
}
