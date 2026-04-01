import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import { AuthGate } from './features/auth/AuthGate';
import { AppLayout } from './components/layout/AppLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { RootLayout } from './components/layout/RootLayout';
import { HomePage } from './pages/HomePage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/auth" element={<AuthLayout />} />

            <Route
              element={
                <AuthGate>
                  <AppLayout />
                </AuthGate>
              }
            >
              <Route path="/" element={<HomePage />} />
              {/* <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} /> */}
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
