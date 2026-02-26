"use client";

import { ReactNode, useEffect } from 'react';
import { Toast } from "@base-ui/react/toast";
import { SolanaProvider } from "@/solana/solana-provider";
import { Toaster } from "@/components/ui/Toast/Toast";
import { initAuthPersistence } from '@/firebase/client';

export default function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize Firebase auth persistence ONCE per app load
    void initAuthPersistence();
  }, []);

  return (
    <Toast.Provider>
      <SolanaProvider>
        {children}
        <Toaster />
      </SolanaProvider>
    </Toast.Provider>
  );
}