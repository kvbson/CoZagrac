export function SteamButton() {
  function handleSteamLogin() {
    window.location.href = '/auth/steam';
  }

  return <button onClick={handleSteamLogin}>Sign in with Steam</button>;
}
