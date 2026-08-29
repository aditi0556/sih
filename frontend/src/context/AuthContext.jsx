import { createContext, useContext, useState, useEffect } from 'react'
import { createAuthClient } from 'better-auth/react'

const authClient = createAuthClient({
  baseURL: 'http://localhost:3001',
})

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await authClient.getSession()
        setSession(data)
      } catch {
        setSession(null)
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [])

  const signIn = async (email, password) => {
    const result = await authClient.signIn.email({ email, password })
    if (result.data) setSession(result.data.session)
    return result
  }

  const signUp = async (name, email, password) => {
    return await authClient.signUp.email({ name, email, password })
  }

  const signOut = async () => {
    await authClient.signOut()
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut, authClient }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
