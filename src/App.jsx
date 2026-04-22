import { Route, Routes, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { LandsPage } from './pages/LandsPage'
import { RentalsPage } from './pages/RentalsPage'
import { CommunitiesPage } from './pages/CommunitiesPage'
import { CommunityPage } from './pages/CommunityPage'
import { InventoryPage } from './pages/InventoryPage'
import { AdminPage } from './pages/AdminPage'
import { DiagnosePage } from './pages/DiagnosePage'
import { DiagnosisDetailPage } from './pages/DiagnosisDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { PublicProfilePage } from './pages/PublicProfilePage'
import { ProvidersPage } from './pages/ProvidersPage'
import { FollowingFeedPage } from './pages/FollowingFeedPage'
import { DiscoveryPage } from './pages/DiscoveryPage'
import { DiscoveryArticlePage } from './pages/DiscoveryArticlePage'
import { AssistantPage } from './pages/AssistantPage'
import { RecommendationsPage } from './pages/RecommendationsPage'
import { RecommendationDetailPage } from './pages/RecommendationDetailPage'
import { AppointmentsPage } from './pages/AppointmentsPage'

/**
 * Top-level routes: public marketing/auth, protected /app/* feature stubs.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="lands" element={<LandsPage />} />
        <Route path="rentals" element={<RentalsPage />} />
        <Route path="communities" element={<CommunitiesPage />} />
        <Route path="communities/:communityId" element={<CommunityPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="discovery" element={<DiscoveryPage />} />
        <Route path="discovery/:articleId" element={<DiscoveryArticlePage />} />
        <Route
          path="following"
          element={
            <ProtectedRoute roles={['farmer']}>
              <FollowingFeedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="assistant"
          element={
            <ProtectedRoute roles={['farmer']}>
              <AssistantPage />
            </ProtectedRoute>
          }
        />
        <Route path="inventory" element={<InventoryPage />} />
        <Route
          path="diagnose"
          element={
            <ProtectedRoute roles={['farmer']}>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route index element={<DiagnosePage />} />
          <Route path=":diagnosisId" element={<DiagnosisDetailPage />} />
        </Route>
        <Route path="settings" element={<SettingsPage />} />
        <Route path="users/:userId" element={<PublicProfilePage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="recommendations"
          element={
            <ProtectedRoute roles={['farmer']}>
              <Outlet />
            </ProtectedRoute>
          }
        >
          <Route index element={<RecommendationsPage />} />
          <Route path=":recommendationId" element={<RecommendationDetailPage />} />
        </Route>
        <Route path="appointments" element={<AppointmentsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
