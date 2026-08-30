import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// Thin wrapper around fetch that always sends/receives the session cookie
// and normalizes responses into a { data, error } shape (mirrors what the
// SignupPage/LoginPage components already expect).
async function apiFetch(path, options = {}) {
  let res
  try {
    res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    })
  } catch {
    return { data: null, error: { message: 'Could not reach the server. Is the backend running?' } }
  }

  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok) {
    return { data: null, error: { message: body?.detail || 'Something went wrong' } }
  }
  return { data: body, error: null }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await apiFetch('/auth/session')
      setSession(data?.user ? data : null)
      setLoading(false)
    }
    fetchSession()
  }, [])

  const signIn = async (email, password) => {
    const result = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (result.data) setSession(result.data) // { user: {...} }
    return result
  }

  const signUp = async (name, email, password) => {
    // /auth/signup only creates the account; it doesn't log the user in.
    return await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  }

  const signOut = async () => {
    await apiFetch('/auth/logout', { method: 'POST' })
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}