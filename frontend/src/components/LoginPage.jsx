import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" {...props}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.9 11.9 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn(email, password)
      if (result.error) {
        setError(result.error.message || 'Invalid email or password')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    // Full page navigation — the backend handles the OAuth round trip with
    // Google and redirects back once the session cookie is set.
    window.location.href = '/auth/google/login'
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

          <h1 className="text-3xl font-bold text-white mb-2">Sign in</h1>
          <p className="text-white/50 text-sm mb-8">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-green-400 hover:text-green-300 transition-colors">
              Sign up
            </Link>
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 mb-6 rounded-xl bg-white hover:bg-white/90 text-black font-medium text-sm transition-all duration-200"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-white/30 text-xs uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
              className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-all duration-200 shadow-[0_0_25px_rgba(74,222,128,0.3)] hover:shadow-[0_0_40px_rgba(74,222,128,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p className="mt-6 text-center text-white/30 text-xs">
            By signing in you agree to our{' '}
            <span className="underline cursor-pointer hover:text-white/60">Terms</span> and{' '}
            <span className="underline cursor-pointer hover:text-white/60">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  )
}