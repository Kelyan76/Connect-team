import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { queryClient } from '@/shared/lib/query-client';
import { TooltipProvider } from '@/shared/ui/menu';
import { Toaster } from '@/shared/ui/toaster';
import { PeriodProvider } from './providers/period';
import { ThemeProvider } from './providers/theme';
import { router } from './router';

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <PeriodProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
            <Toaster dark={false} />
          </PeriodProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
