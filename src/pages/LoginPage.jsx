import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Email/password login — Airbnb-style card on white canvas.
 */
export function LoginPage() {
  const { login, user, loading } = useAuth()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/app'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to={from} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md rounded-[20px] border border-[#ebebeb] p-8 shadow-card">
        <h1 className="text-[22px] font-semibold leading-[1.18] tracking-[-0.44px] text-[#222222]">
          Log in
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-1 block text-[14px] font-medium text-[#222222]">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[14px] font-medium text-[#222222]">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
            />
          </div>
          {error && (
            <p className="text-[14px] text-[#c13515]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[8px] bg-[#ff385c] px-6 py-3 text-[16px] font-medium text-white transition hover:bg-[#e00b41] disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Continue'}
          </button>
        </form>

        <p className="mt-5 text-center text-[14px] text-[#6a6a6a]">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-[#222222] underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
