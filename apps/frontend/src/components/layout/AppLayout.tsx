import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar/Navbar';

export const AppLayout = () => {
  return (
    <div>
      <Navbar />
      <main className="app content">
        <Outlet />
      </main>
    </div>
  );
};
