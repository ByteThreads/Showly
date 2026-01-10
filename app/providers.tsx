'use client';

import { AuthProvider } from '@/lib/auth-context';
import { PostHogProvider } from '@/lib/posthog';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </PostHogProvider>
  );
}
