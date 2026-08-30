import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import FeaturesCloud from './components/FeaturesCloud'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import DriverDashboard from './components/driver_dashboard/DriverDashboard'

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
          <Route path="/dashboard" element={<><Navbar /><DriverDashboard /></>} />
          <Route path="/driver" element={<><Navbar /><DriverDashboard /></>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
