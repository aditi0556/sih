import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import FeaturesCloud from './components/FeaturesCloud'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import AdminDashboard from './components/AdminDashboard'
import DriverDashboard from './components/driver_dashboard/DriverDashboard'
import SurveyDashboard from './components/SurveyDashboard'

function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <FeaturesCloud />
    </>
  )
}

function RoleDashboardRouter() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 text-sm">Loading your dashboard…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const role = session.user?.role
  if (role === 'admin') {
    return <Navigate to="/admin" replace />
  } else if (role === 'server' || role === 'survey') {
    return <Navigate to="/survey" replace />
  } else {
    return <Navigate to="/driver" replace />
  }
}

function ProtectedRoute({ element, allowedRoles = [] }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 text-sm">Verifying role access…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const role = session.user?.role || 'driver'

  // Admin has access to all dashboards for oversight
  if (role === 'admin') {
    return (
      <>
        <Navbar />
        {element}
      </>
    )
  }

  // Check if role is allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to their own dedicated dashboard
    if (role === 'server' || role === 'survey') {
      return <Navigate to="/survey" replace />
    } else {
      return <Navigate to="/driver" replace />
    }
  }

  return (
    <>
      <Navbar />
      {element}
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<><Navbar /><LoginPage /></>} />
          <Route path="/signup" element={<><Navbar /><SignupPage /></>} />
          
          {/* Dedicated role dashboards */}
          <Route
            path="/admin"
            element={<ProtectedRoute element={<AdminDashboard />} allowedRoles={['admin']} />}
          />
          <Route
            path="/survey"
            element={<ProtectedRoute element={<SurveyDashboard />} allowedRoles={['server', 'survey']} />}
          />
          <Route
            path="/driver"
            element={<ProtectedRoute element={<DriverDashboard />} allowedRoles={['driver', 'user']} />}
          />
          <Route path="/dashboard" element={<RoleDashboardRouter />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App