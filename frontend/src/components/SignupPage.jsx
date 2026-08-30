import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Trash2, ShieldCheck, Truck, ClipboardList, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  {
    id: 'driver',
    title: 'Driver',
    subtitle: 'Waste Truck Driver',
    desc: 'Access live collection routes, stop sequence & navigation map',
    icon: Truck,
    color: 'green',
    targetRoute: '/driver',
  },
  {
    id: 'survey',
    title: 'Survey',
    subtitle: 'Field Audit Team',
    desc: 'Audit dustbin fill levels and verify ground waste hotspots',
    icon: ClipboardList,
    color: 'emerald',
    targetRoute: '/survey',
  },

  {
    id: 'admin',
    title: 'Admin',
    subtitle: 'Municipal Administrator',
    desc: 'City-wide fleet overview, ML prediction & route optimization',
    icon: ShieldCheck,
    color: 'purple',
    targetRoute: '/admin',
  },
]

export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState('driver')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const currentRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const result = await signUp(name, email, password, selectedRole)
      if (result.error) {
        setError(result.error.message || 'Sign up failed. Please try a different email.')
      } else {
        // Direct navigation to their chosen role dashboard
        navigate(currentRoleConfig.targetRoute)
      }
    } catch {
      setError('Something went wrong during account creation.')
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
            <span>Create New Account</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            Join the Smart Waste Network
          </h1>
          <p className="text-white/50 text-sm max-w-md mx-auto">
            Choose your role to get onboarded with the proper permissions.
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
                onClick={() => setSelectedRole(role.id)}
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

        {/* ── Active Form Panel ──────────────────────────────────────────── */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
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
                Registering as {currentRoleConfig.title}
              </p>
              <p className="text-xs text-white/50">{currentRoleConfig.desc}</p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Bhat"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:bg-white/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:bg-white/10 transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-4 py-3 pr-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:bg-white/10 transition-all"
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

              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5">Confirm Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:bg-white/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-black font-extrabold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 mt-2 ${
                selectedRole === 'server'
                  ? 'bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20'
                  : selectedRole === 'admin'
                  ? 'bg-purple-400 hover:bg-purple-300 shadow-purple-500/20'
                  : 'bg-green-400 hover:bg-green-300 shadow-green-500/20'
              }`}
            >
              {loading ? (
                'Creating Account…'
              ) : (
                <>
                  <span>Complete Registration as {currentRoleConfig.title}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom Login Link */}
        <p className="text-center text-white/40 text-xs">
          Already have an account?{' '}
          <Link to="/login" className="text-green-400 hover:text-green-300 font-medium">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  )
}