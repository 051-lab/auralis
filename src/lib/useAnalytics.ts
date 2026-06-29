'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from './analytics';

/**
 * Hook to track page views on route changes
 * Uses Next.js App Router navigation hooks
 */
export function useAnalytics() {
  const pathname = usePathname();
  const didTrackInitialPageView = useRef(false);

  useEffect(() => {
    if (!didTrackInitialPageView.current) {
      didTrackInitialPageView.current = true;
      return;
    }

    if (pathname) {
      analytics.trackPageView();
    }
  }, [pathname]);

  return { analytics };
}
