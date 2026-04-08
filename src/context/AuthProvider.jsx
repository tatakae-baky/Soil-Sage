import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi, getToken, setToken } from '../lib/api'
import { AuthContext } from './authContext.js'

/**
 * Provides current user, token helpers, and auth actions for the SPA.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const data = await authApi.me()
      setUser(data.user)
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      /** True when session resolved and user is present */
      isAuthenticated: Boolean(user),
    }),
    [user, loading, login, register, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
