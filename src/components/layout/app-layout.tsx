'use client';

import { Sidebar } from './sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex relative text-foreground">
      <Sidebar />

      <main
        className="flex-1 ml-[12rem] min-w-0 lg:ml-[12rem] relative z-10"
        style={{ width: 'calc(100% - 12rem)' }}
      >
        <div className="p-6 lg:p-10 xl:p-14">
          {children}
        </div>
      </main>
    </div>
  );
}