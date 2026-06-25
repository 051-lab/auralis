/**
 * Analytics Utility Module
 * 
 * Privacy-friendly analytics using Plausible.io
 * - No cookies, no persistent storage
 * - Lightweight script (~1KB)
 * - GDPR/PECR compliant
 * 
 * Events tracked:
 * - Page views
 * - Audio start/stop
 * - WAV exports
 * - Preset loads/saves
 */

type AnalyticsEvent = 
  | 'pageview'
  | 'audio_start'
  | 'audio_stop'
  | 'audio_export'
  | 'preset_load'
  | 'preset_save'
  | 'preset_delete'
  | 'timer_complete'
  | 'binaural_activate';

interface AnalyticsEventProps {
  [key: string]: string | number | boolean;
}

class AnalyticsService {
  private enabled: boolean;
  private domain: string;
  private isInitialized: boolean = false;

  constructor() {
    this.enabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
    this.domain = process.env.NEXT_PUBLIC_ANALYTICS_ID || '';
    
    // Only initialize in browser
    if (typeof window !== 'undefined' && this.enabled && this.domain) {
      this.initialize();
    }
  }

  private initialize() {
    if (this.isInitialized) return;

    // Dynamically load Plausible script
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = this.domain;
    script.src = 'https://plausible.io/js/script.js';
    
    script.onerror = () => {
      console.warn('[Analytics] Failed to load Plausible script');
    };

    document.head.appendChild(script);
    this.isInitialized = true;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Initialized with domain:', this.domain);
    }
  }

  /**
   * Track custom event
   */
  track(event: AnalyticsEvent, props?: AnalyticsEventProps): void {
    // If disabled, log to console in development
    if (!this.enabled) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics] Event (disabled):', event, props);
      }
      return;
    }

    // Check if online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics] Offline - event not sent:', event);
      }
      return;
    }

    // Send event to Plausible
    if (typeof window !== 'undefined' && this.isInitialized) {
      const plausible = (window as any).plausible;
      if (plausible) {
        plausible(event, { props });
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics] Event sent:', event, props);
      }
    }
  }

  /**
   * Track page view
   */
  trackPageView(): void {
    this.track('pageview');
  }

  /**
   * Track audio start
   */
  trackAudioStart(): void {
    this.track('audio_start');
  }

  /**
   * Track audio stop
   */
  trackAudioStop(reason?: string): void {
    this.track('audio_stop', reason ? { reason } : {});
  }

  /**
   * Track WAV export
   */
  trackExport(duration?: number): void {
    this.track('audio_export', duration ? { duration_seconds: Math.round(duration) } : {});
  }

  /**
   * Track preset load
   */
  trackPresetLoad(presetName: string, source?: 'url' | 'local' | 'shared'): void {
    this.track('preset_load', { 
      name: presetName,
      source: source || 'local'
    });
  }

  /**
   * Track preset save
   */
  trackPresetSave(presetName: string): void {
    this.track('preset_save', { name: presetName });
  }

  /**
   * Track preset delete
   */
  trackPresetDelete(presetName: string): void {
    this.track('preset_delete', { name: presetName });
  }

  /**
   * Track timer completion
   */
  trackTimerComplete(duration: number): void {
    this.track('timer_complete', { duration_minutes: duration / 60 });
  }

  /**
   * Track binaural mode activation
   */
  trackBinauralActivate(presetName: string, frequency: number): void {
    this.track('binaural_activate', { 
      preset: presetName,
      frequency_hz: frequency
    });
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

// Export types for convenience
export type { AnalyticsEvent, AnalyticsEventProps };
