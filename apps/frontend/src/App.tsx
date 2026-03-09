import { Routes, Route } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { AuthProvider } from './features/auth/AuthProvider';

export function App() {
  return (
    // <BrowserRouter>
    <Routes>
      <Route element={<AuthProvider />}>
        <Route path="/" element={<HomePage />} />
      </Route>

      <Route path="/auth" element={<AuthPage />} />
    </Routes>
    // </BrowserRouter>
  );
}
