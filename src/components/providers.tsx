'use client';

import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SmoothScrollProvider } from '@/components/providers/smooth-scroll-provider';
import { RoomModeGuard } from '@/components/room/room-mode-guard';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScrollProvider>
      <TooltipProvider>
        <RoomModeGuard>
          {children}
        </RoomModeGuard>
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast: 'glass border-border-subtle',
              description: 'text-muted-foreground',
              actionButton: 'bg-primary text-primary-foreground',
              cancelButton: 'bg-muted text-muted-foreground',
            },
          }}
        />
      </TooltipProvider>
    </SmoothScrollProvider>
  );
}