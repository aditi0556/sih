import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import FeaturesCloud from './components/FeaturesCloud'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import AdminDashboard from './components/AdminDashboard'

function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <FeaturesCloud />
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
          <Route
            path="/dashboard"
            element={
              <>
                <Navbar />
                <div className="min-h-screen bg-black flex items-center justify-center">
                  <p className="text-white/50 text-lg">Dashboard coming soon…</p>
                </div>
              </>
            }
          />
          <Route
            path="/admin"
            element={
              <>
                <Navbar />
                <AdminDashboard />
              </>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App