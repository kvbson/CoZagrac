import { userService } from '../../services/userService';

type SteamButtonProps = {
  className?: string;
};

export function SteamButton({ className }: SteamButtonProps) {
  async function handleSteamLogin() {
    const res = await userService.loginBySteam();
    return res;
  }

  return (
    <button className={className} onClick={handleSteamLogin}>
      Zaloguj przez Steam
    </button>
  );
}
