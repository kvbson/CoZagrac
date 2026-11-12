import { Link } from 'react-router-dom';
import { useConsent, acceptConsent, declineConsent } from './consent';

export function ConsentBanner() {
  const consent = useConsent();

  if (consent !== null) {
    return null;
  }

  return (
    <div className="consent-banner" role="dialog" aria-label="Cookie consent">
      <p>
        We use Google Analytics (cookies) to understand how the app is used. Data is
        collected only after you agree. Read the <Link to="/privacy">privacy policy</Link>.
      </p>
      <div className="consent-banner__actions">
        <button onClick={acceptConsent}>Accept</button>
        <button onClick={declineConsent}>Decline</button>
      </div>
    </div>
  );
}
