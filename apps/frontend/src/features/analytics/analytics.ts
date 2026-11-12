// Thin typed wrapper over the gtag() global defined in index.html.
// Consent defaults to "denied" there; analytics is enabled only after
// the user accepts in ConsentBanner (features/consent).

export type AnalyticsConsent = 'granted' | 'denied';

type ConsentParams = {
  analytics_storage: AnalyticsConsent;
};

type GtagCommand =
  | ['consent', 'default' | 'update', ConsentParams]
  | ['event', string, Record<string, unknown>?]
  | ['js', Date]
  | ['config', string, Record<string, unknown>?];

declare global {
  interface Window {
    gtag?: (...args: GtagCommand) => void;
  }
}

// Local mirror of the consent decision: custom events are only pushed when
// the user has granted analytics for this page load.
let consentGranted = false;

function pushGtag(...args: GtagCommand): void {
  window.gtag?.(...args);
}

/** Enable analytics for this page load (idempotent, safe to call repeatedly). */
export function grantAnalyticsConsent(): void {
  consentGranted = true;
  pushGtag('consent', 'update', { analytics_storage: 'granted' });
}

/** Disable analytics for this page load (user declined or withdrew consent). */
export function denyAnalyticsConsent(): void {
  consentGranted = false;
  pushGtag('consent', 'update', { analytics_storage: 'denied' });
}

/** SPA-friendly page_view: call on every route change, not just first load. */
export function trackPageView(path: string): void {
  if (!consentGranted) return;
  pushGtag('event', 'page_view', { page_path: path, page_title: document.title });
}

/** Custom product event; silently dropped when analytics consent is not granted. */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!consentGranted) return;
  pushGtag('event', name, params);
}
