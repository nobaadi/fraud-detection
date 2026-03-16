import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const InvestigatePage = lazy(() => import('./pages/InvestigatePage'));
const NetworkPage = lazy(() => import('./pages/NetworkPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#2a2a2a',
        color: '#9ca3af',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
      }}
    >
      Loading view...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/investigate/:id" element={<InvestigatePage />} />
            <Route path="/network" element={<NetworkPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/upload" element={<UploadPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
