import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { grantAnalyticsConsent, trackPageView } from './analytics';
import { useConsent } from '../consent/consent';

// Sends a page_view on every route change (SPA) and right after consent
// is granted, so the first visited page is measured too.
export function PageTracking() {
  const location = useLocation();
  const consent = useConsent();

  useEffect(() => {
    if (consent !== 'granted') {
      return;
    }
    grantAnalyticsConsent();
    trackPageView(`${location.pathname}${location.search}`);
  }, [consent, location.pathname, location.search]);

  return null;
}
