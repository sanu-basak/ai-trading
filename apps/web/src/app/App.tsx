import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthBootstrap } from '@/features/auth/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { InstrumentsPage } from '@/features/instruments/InstrumentsPage';
import { AnalyzePage } from '@/features/ai-analysis/AnalyzePage';
import { WatchlistPage } from '@/features/watchlist/WatchlistPage';
import { PaperTradingPage } from '@/features/paper-trading/PaperTradingPage';
import { JournalPage } from '@/features/trade-journal/JournalPage';

export function App() {
  useAuthBootstrap();

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/instruments" element={<InstrumentsPage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/watchlists" element={<WatchlistPage />} />
          <Route path="/paper" element={<PaperTradingPage />} />
          <Route path="/journal" element={<JournalPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
