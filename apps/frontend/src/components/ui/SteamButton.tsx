import { userService } from '../../services/userService';

type SteamButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export function SteamButton({ className, children }: SteamButtonProps) {
  async function handleSteamLogin() {
    const res = await userService.loginBySteam();
    return res;
  }

  return (
    <button type="button" className={className} onClick={handleSteamLogin}>
      {children ?? 'Sign in with Steam'}
    </button>
  );
}
