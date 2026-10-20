import { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { userService } from '../../services/userService';

export function Navbar() {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  async function handleLogout() {
    await userService.logout();
    setUser(null);
    navigate('/auth', { replace: true });
  }

  return (
    <header className="navbar">
      <NavLink to="/" className="navbar__brand">
        CoZagrac
      </NavLink>

      <nav className="navbar__links">
        <NavLink to="/recommendations">Recommendations</NavLink>
        <button onClick={handleLogout}>Log out</button>
      </nav>
    </header>
  );
}
