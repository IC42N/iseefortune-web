import {ReactNode} from 'react';
import AppShell from "@/components/AppShell/AppShell";

export default function GameLayout({ children,modal}: { children: ReactNode; modal: ReactNode; }) {
  return (
    <AppShell>
      {children}
      {modal}
    </AppShell>
  );
}