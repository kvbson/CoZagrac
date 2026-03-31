import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar/Navbar';

export const AppLayout = () => {
  return (
    <div className="app">
      <nav className="navbar">
        <Navbar />
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};
