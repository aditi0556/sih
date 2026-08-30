import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Trash2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const perks = [
  'Daily ML-powered bin capacity forecasts',
  'Optimised truck routing via graph algorithms',
  'Live interactive city map',
  'Real-time overflow alerts',
]

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const result = await signUp(name, email, password)
      if (result.error) {
        setError(result.error.message || 'Sign up failed. Try a different email.')
      } else {
        navigate('/login')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex">

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Trash2 className="w-5 h-5 text-green-400" />
            <span className="text-white font-bold text-lg">Care<span className="text-green-400">India</span></span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
          <p className="text-white/50 text-sm mb-8">
            Already have an account?{' '}
            <Link to="/login" className="text-green-400 hover:text-green-300 transition-colors">
              Sign in
            </Link>
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-white/60 text-sm mb-2">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Bob Smith"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-white/60 text-sm mb-2">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/60 text-sm mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
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

            {/* Confirm password */}
            <div>
              <label className="block text-white/60 text-sm mb-2">Confirm password</label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-green-500/60 focus:bg-white/10 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all duration-200 shadow-[0_0_25px_rgba(74,222,128,0.3)] hover:shadow-[0_0_40px_rgba(74,222,128,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create Account →'}
            </button>
          </form>

          <p className="mt-6 text-center text-white/30 text-xs">
            By creating an account you agree to our{' '}
            <span className="underline cursor-pointer hover:text-white/60">Terms</span> and{' '}
            <span className="underline cursor-pointer hover:text-white/60">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
