import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Trash2, LogOut, LayoutDashboard, ShieldCheck, ClipboardList, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const userRole = session?.user?.role || ''
  const isAdmin = userRole === 'admin'
  const isServer = userRole === 'server' || userRole === 'survey'
  const isDriver = userRole === 'driver' || (!isAdmin && !isServer && !!session)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
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
                {/* Role badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
                  <User className="w-3.5 h-3.5 text-green-400" />
                  <span className="font-semibold text-white">{session.user.name || session.user.email}</span>
                  <span className="text-white/40">·</span>
                  <span className="uppercase text-[10px] font-bold tracking-wider text-green-400">
                    {userRole || 'User'}
                  </span>
                </div>

                {/* Role-Specific Dashboard Link */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-purple-500/20 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    Admin Dashboard
                  </Link>
                )}

                {isServer && (
                  <Link
                    to="/survey"
                    className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-emerald-500/20 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-all"
                  >
                    <ClipboardList className="w-4 h-4 text-emerald-400" />
                    Survey Dashboard
                  </Link>
                )}

                {isDriver && (
                  <Link
                    to="/driver"
                    className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-green-500/20 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all"
                  >
                    <LayoutDashboard className="w-4 h-4 text-green-400" />
                    Driver Dashboard
                  </Link>
                )}

                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
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
          <div className="md:hidden pb-4 pt-2 border-t border-white/10 mt-1 space-y-2">
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
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-2 text-sm text-purple-300 font-semibold hover:bg-white/10 rounded-lg transition"
                  >
                    Admin Dashboard
                  </Link>
                )}
                {isServer && (
                  <Link
                    to="/survey"
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-2 text-sm text-emerald-300 font-semibold hover:bg-white/10 rounded-lg transition"
                  >
                    Survey Dashboard
                  </Link>
                )}

                {isDriver && (
                  <Link
                    to="/driver"
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-2 text-sm text-green-300 font-semibold hover:bg-white/10 rounded-lg transition"
                  >
                    Driver Dashboard
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 rounded-lg transition cursor-pointer"
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