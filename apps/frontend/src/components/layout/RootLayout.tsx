import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar/Navbar';

export const RootLayout = () => {
  return (
    <div className="root">
      <Navbar />
      <Outlet />
    </div>
  );
};
