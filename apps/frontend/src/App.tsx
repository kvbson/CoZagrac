import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { AuthProvider } from './features/auth/AuthProvider';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <AuthProvider>
          <Route path="/" element={<HomePage />} />
        </AuthProvider>
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}
