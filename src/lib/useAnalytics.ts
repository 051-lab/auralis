'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics } from './analytics';

/**
 * Hook to track page views on route changes
 * Uses Next.js App Router navigation hooks
 */
export function useAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view on route change
    if (pathname) {
      analytics.trackPageView();
    }
  }, [pathname, searchParams]);

  return { analytics };
}
