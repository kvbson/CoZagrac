import { Link } from 'react-router-dom';
import { reopenConsentChoice } from '../features/consent/consent';

// Static privacy notice, available without login (see /privacy route in App).
export function PrivacyPage() {
  return (
    <main className="page privacy">
      <h1>Privacy policy</h1>
      <p className="muted">Last updated: November 2026</p>

      <h2>Who we are</h2>
      <p>
        This policy describes how co-zagrac.pl — a game recommendation service — handles your data.
        The service is operated by the project team; questions about this policy can be sent to the
        operator&apos;s contact address jakub.porwol@student.wsb.edu.pl.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Account</strong> — email address and a password hash (local sign-in) or your
          SteamID64 (Steam sign-in). We never see your Steam password.
        </li>
        <li>
          <strong>Recommendation profile</strong> — a numeric vector (embedding) computed from your
          Steam library playtime or the games you pick as favorites. It cannot be traced back to a
          specific person by itself.
        </li>
        <li>
          <strong>Favorite games</strong> — the games you manually select as the basis of your
          profile.
        </li>
        <li>
          <strong>Session</strong> — a session cookie so you stay logged in.
        </li>
      </ul>

      <h2>What we do not store</h2>
      <ul>
        <li>
          Your Steam library is read live from the Steam API to build the profile and is not saved
          on our side.
        </li>
        <li>
          We never send personal data to OpenAI — only anonymous game descriptions and categories.
        </li>
      </ul>

      <h2>Legal basis</h2>
      <ul>
        <li>
          <strong>Account data</strong> — processed to provide the service you signed up for
          (performance of a contract).
        </li>
        <li>
          <strong>Analytics cookies</strong> — processed only with your consent, which you can
          withdraw at any time (see below).
        </li>
      </ul>

      <h2>Data retention</h2>
      <ul>
        <li>Account, profile and favorites are kept until you delete your account.</li>
        <li>Sessions expire automatically after a period of inactivity.</li>
      </ul>

      <h2>Third parties</h2>
      <ul>
        <li>
          <strong>Valve (Steam Web API)</strong> — used to read your library when you link your
          account and to fetch game data.
        </li>
        <li>
          <strong>OpenAI</strong> — computes game embeddings; receives only game descriptions and
          categories, never your personal data.
        </li>
        <li>
          <strong>Google (Google Analytics)</strong> — receives anonymized usage events (visited
          pages, used filters) only after you accept analytics cookies.
        </li>
      </ul>

      <h2>Cookies &amp; Google Analytics</h2>
      <p>
        We use Google Analytics to measure anonymized usage of the app (visited pages, used
        filters). Analytics cookies are set <strong>only if you accept</strong> in the consent
        banner — by default analytics is off. You can withdraw your consent at any time:
      </p>
      <button onClick={reopenConsentChoice}>Change cookie settings</button>

      <h2>Deleting your data</h2>
      <p>
        You can delete your account (including your profile and favorites) on the{' '}
        <Link to="/account">account page</Link>, which removes all data associated with it.
      </p>

      <h2>Your rights</h2>
      <p>
        You have the right to access, rectify and erase your data, restrict or object to its
        processing, and to data portability. To exercise any of these rights, delete your account
        via the link above or contact us. If you believe your data is handled unlawfully, you may
        lodge a complaint with your local data protection authority.
      </p>
    </main>
  );
}
