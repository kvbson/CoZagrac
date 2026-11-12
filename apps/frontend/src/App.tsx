import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './features/auth/AuthProvider';
import { AuthGate } from './features/auth/AuthGate';
import { PageTracking } from './features/analytics/PageTracking';
import { ConsentBanner } from './features/consent/ConsentBanner';
import { AuthPage } from './pages/AuthPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { GameDetailsPage } from './pages/GameDetailsPage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { AccountPage } from './pages/AccountPage';
import { AppLayout } from './components/layout/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PageTracking />
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            <Route
              element={
                <AuthGate>
                  <AppLayout />
                </AuthGate>
              }
            >
              <Route path="/" element={<Navigate to="/recommendations" replace />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/games/:appId" element={<GameDetailsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ConsentBanner />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
