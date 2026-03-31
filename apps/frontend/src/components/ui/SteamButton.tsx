import { userService } from '../../services/userService';

export function SteamButton() {
  async function handleSteamLogin() {
    const res = await userService.loginBySteam();
    return res;
  }

  return <button onClick={handleSteamLogin}>Sign in with Steam</button>;
}
