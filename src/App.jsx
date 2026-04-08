import { Route, Routes, Navigate } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { LandsPage } from './pages/LandsPage'
import { RentalsPage } from './pages/RentalsPage'
import { CommunitiesPage } from './pages/CommunitiesPage'
import { InventoryPage } from './pages/InventoryPage'
import { AdminPage } from './pages/AdminPage'

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
        <Route path="inventory" element={<InventoryPage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
