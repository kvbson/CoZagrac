import { useSyncExternalStore } from 'react';
import {
  denyAnalyticsConsent,
  grantAnalyticsConsent,
  type AnalyticsConsent,
} from '../analytics/analytics';

// Consent is a small app-wide value shared by the banner and the privacy
// page, so it lives in a module store consumed via useSyncExternalStore
// instead of being duplicated across independent hook instances.

const CONSENT_STORAGE_KEY = 'cz_analytics_consent';

function readStoredConsent(): AnalyticsConsent | null {
  const value = localStorage.getItem(CONSENT_STORAGE_KEY);
  return value === 'granted' || value === 'denied' ? value : null;
}

let consent: AnalyticsConsent | null = readStoredConsent();
const listeners = new Set<() => void>();

// A fresh page load resets gtag consent to denied (index.html), so a stored
// "granted" has to be re-applied when the app bundle boots.
if (consent === 'granted') {
  grantAnalyticsConsent();
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getConsent(): AnalyticsConsent | null {
  return consent;
}

export function acceptConsent(): void {
  consent = 'granted';
  localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  grantAnalyticsConsent();
  notify();
}

export function declineConsent(): void {
  consent = 'denied';
  localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  denyAnalyticsConsent();
  notify();
}

/** Forget the decision so the banner shows up again (privacy page action). */
export function reopenConsentChoice(): void {
  consent = null;
  localStorage.removeItem(CONSENT_STORAGE_KEY);
  notify();
}

export function useConsent(): AnalyticsConsent | null {
  return useSyncExternalStore(subscribeConsent, getConsent);
}
