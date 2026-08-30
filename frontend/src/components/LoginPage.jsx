import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Trash2, ShieldCheck, Truck, ClipboardList, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  {
    id: 'survey',
    title: 'Survey',
    subtitle: 'Field Audit Team',
    desc: 'Ground-truth audits, dustbin fill updates & hotspot verification',
    icon: ClipboardList,
    color: 'emerald',
    badge: 'Field Survey Unit',
    defaultEmail: 'survey@sih.com',
    defaultPassword: 'survey123',
    targetRoute: '/survey',
  },
  {
    id: 'admin',
    title: 'Admin',
    subtitle: 'System Administrator',
    desc: 'Route optimization, ML fill models & city fleet management',
    icon: ShieldCheck,
    color: 'purple',
    badge: 'Municipal Control',
    defaultEmail: 'admin@sih.com',
    defaultPassword: 'admin123',
    targetRoute: '/admin',
  },
  {
    id: 'driver',
    title: 'Driver',
    subtitle: 'Waste Truck Driver',
    desc: 'Live turn-by-turn route, collection stops & GIS map',
    icon: Truck,
    color: 'green',
    badge: 'Fleet Operator',
    defaultEmail: 'arjun@sih.com',
    defaultPassword: 'driver123',
    targetRoute: '/driver',
  },
]

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('survey') // 'survey' | 'admin' | 'driver'
  const [email, setEmail] = useState('survey@sih.com')
  const [password, setPassword] = useState('survey123')

  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const currentRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0]

  const handleSelectRole = (role) => {
    setSelectedRole(role.id)
    setEmail(role.defaultEmail)
    setPassword(role.defaultPassword)
    setError('')
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn(email, password)
      if (result.error) {
        setError(result.error.message || 'Invalid email or password for this role')
      } else {
        const userRole = result.data?.user?.role || selectedRole
        if (userRole === 'admin' || selectedRole === 'admin') {
          navigate('/admin')
        } else if (userRole === 'server' || userRole === 'survey' || selectedRole === 'server') {
          navigate('/survey')
        } else {
          navigate('/driver')
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (role) => {
    setSelectedRole(role.id)
    setEmail(role.defaultEmail)
    setPassword(role.defaultPassword)
    setError('')
    setLoading(true)
    try {
      const result = await signIn(role.defaultEmail, role.defaultPassword)
      if (result.error) {
        setError(result.error.message || 'Could not sign in with demo credentials')
      } else {
        navigate(role.targetRoute)
      }
    } catch {
      setError('Connection error during quick sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl space-y-8 relative z-10">
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-white/80 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-green-400" />
            <span>Role-Based Access Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            Choose Your Portal & Sign In
          </h1>
          <p className="text-white/50 text-sm max-w-md mx-auto">
            Select your assigned role to access your dedicated dashboard.
          </p>
        </div>

        {/* ── Role Selection Tabs ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {ROLES.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelectRole(role)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? role.id === 'server'
                      ? 'bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                      : role.id === 'admin'
                      ? 'bg-purple-500/15 border-purple-500/50 shadow-[0_0_25px_rgba(168,85,247,0.25)]'
                      : 'bg-green-500/15 border-green-500/50 shadow-[0_0_25px_rgba(74,222,128,0.25)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        role.id === 'server'
                          ? 'text-emerald-400'
                          : role.id === 'admin'
                          ? 'text-purple-400'
                          : 'text-green-400'
                      }`}
                    />
                  </div>
                )}

                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    isSelected
                      ? role.id === 'server'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : role.id === 'admin'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-green-500/20 text-green-400'
                      : 'bg-white/5 text-white/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-white leading-tight">{role.title}</h3>
                  <p className="text-[11px] text-white/50 mt-0.5">{role.subtitle}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Active Role Form Panel ─────────────────────────────────────── */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          {/* Active Role Description Banner */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  selectedRole === 'server'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : selectedRole === 'admin'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-green-500/20 text-green-400'
                }`}
              >
                <currentRoleConfig.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {currentRoleConfig.title} Portal Access
                </p>
                <p className="text-xs text-white/50">{currentRoleConfig.desc}</p>
              </div>
            </div>

            <span className="hidden sm:inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-white/5 border border-white/10 text-white/80">
              {currentRoleConfig.badge}
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">
                {currentRoleConfig.title} Account Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@sih.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:bg-white/10 transition-all font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-white/60 text-xs font-medium">Password</label>
                <span className="text-[11px] text-white/40">Demo: {currentRoleConfig.defaultPassword}</span>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:bg-white/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-black font-extrabold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                selectedRole === 'server'
                  ? 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20'
                  : selectedRole === 'admin'
                  ? 'bg-purple-400 hover:bg-purple-300 shadow-purple-500/20'
                  : 'bg-green-400 hover:bg-green-300 shadow-green-500/20'
              }`}
            >
              {loading ? (
                'Authenticating…'
              ) : (
                <>
                  <span>Sign In to {currentRoleConfig.title} Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo 1-Click Access */}
          <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-white/40">Need quick testing?</span>
            <button
              type="button"
              onClick={() => handleQuickLogin(currentRoleConfig)}
              disabled={loading}
              className="text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>1-Click Login as {currentRoleConfig.title}</span>
            </button>
          </div>
        </div>

        {/* Bottom Signup Link */}
        <p className="text-center text-white/40 text-xs">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-green-400 hover:text-green-300 font-medium">
            Sign up for CareIndia
          </Link>
        </p>
      </div>
    </div>
  )
}