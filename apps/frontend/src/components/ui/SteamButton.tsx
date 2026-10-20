import { userService } from '../../services/userService';

export function SteamButton() {
  return <button onClick={userService.loginBySteam}>Sign in with Steam</button>;
}
