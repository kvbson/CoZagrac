import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { MessageProvider } from './context/MessageProvider';
import { PageTracking } from './features/analytics/PageTracking';
import { AuthGate } from './features/auth/AuthGate';
import { AuthProvider } from './features/auth/AuthProvider';
import { ConsentBanner } from './features/consent/ConsentBanner';
import { AccountPage } from './pages/AccountPage';
import { AuthPage } from './pages/AuthPage';
import { GameDetailsPage } from './pages/GameDetailsPage';
import { LibraryPage } from './pages/LibraryPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { SearchPage } from './pages/SearchPage';

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
      <MessageProvider>
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
      </MessageProvider>
    </QueryClientProvider>
  );
}
