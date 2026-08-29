import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Trash2, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const scrollToFeatures = (e) => {
    e.preventDefault()
    const el = document.getElementById('features')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
    setIsOpen(false)
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-md border-b border-white/10 shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-white font-bold text-xl tracking-tight">
              Care<span className="text-green-400">India</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="px-4 py-2 text-sm text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              Home
            </Link>
            <a
              href="#features"
              onClick={scrollToFeatures}
              className="px-4 py-2 text-sm text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200 cursor-pointer"
            >
              Features
            </a>
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm text-white/80 hover:text-white rounded-lg border border-white/20 hover:border-white/40 hover:bg-white/10 transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium text-black bg-white rounded-lg hover:bg-white/90 shadow-[0px_0px_20px_rgba(255,255,255,0.3)] transition-all duration-200"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-white/10 mt-1 space-y-1">
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              Home
            </Link>
            <a
              href="#features"
              onClick={scrollToFeatures}
              className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              Features
            </a>
            {session ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 rounded-lg transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-black bg-white rounded-lg text-center"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
