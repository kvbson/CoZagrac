import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import { AuthGate } from './features/auth/AuthGate';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { AppLayout } from './components/layout/AppLayout';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />

          <Route
            element={
              <AuthGate>
                <AppLayout />
              </AuthGate>
            }
          />
          <Route path="/" element={<HomePage />} />
          {/* <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} /> */}
          <HomePage />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
