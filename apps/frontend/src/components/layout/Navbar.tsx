import { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { userService } from '../../services/userService';

export function Navbar() {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  async function handleLogout() {
    await userService.logout();
    setUser(null);
    navigate('/auth', { replace: true });
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    if (value) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    }
  }

  return (
    <header className="navbar">
      <NavLink to="/" className="navbar__brand">
        CoZagrac
      </NavLink>

      <form className="navbar__search" onSubmit={handleSearch} role="search">
        <input
          name="q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games…"
          aria-label="Search games"
        />
        <button type="submit">Search</button>
      </form>

      <nav className="navbar__links">
        <NavLink to="/recommendations">Recommendations</NavLink>
        <NavLink to="/library">Library</NavLink>
        <NavLink to="/account">Account</NavLink>
        <button onClick={handleLogout}>Log out</button>
      </nav>
    </header>
  );
}
