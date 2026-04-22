import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ROLE_OPTIONS = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'land_owner', label: 'Land owner' },
  { value: 'specialist', label: 'Specialist' },
]

/**
 * Registration with multi-role checkboxes — Airbnb card styling.
 */
export function RegisterPage() {
  const { register, user, loading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState(['farmer'])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/app" replace />

  function toggleRole(value) {
    setRoles((prev) => {
      if (prev.includes(value)) {
        if (prev.length === 1) return prev
        return prev.filter((r) => r !== value)
      }
      return [...prev, value]
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register({ name, email, phone, password, roles })
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md rounded-[20px] border border-[#ebebeb] p-8 shadow-card">
        <h1 className="text-[22px] font-semibold leading-[1.18] tracking-[-0.44px] text-[#222222]">
          Create account
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-1 block text-[14px] font-medium text-[#222222]">
              Full name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[14px] font-medium text-[#222222]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[14px] font-medium text-[#222222]">
              Phone
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[14px] font-medium text-[#222222]">
              Password (min 8 characters)
            </label>
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none transition focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
            />
          </div>

          <fieldset>
            <legend className="text-[14px] font-medium text-[#222222]">
              I am a…
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] transition has-[:checked]:border-[#222222] has-[:checked]:bg-[#f7f7f7]"
                >
                  <input
                    type="checkbox"
                    checked={roles.includes(opt.value)}
                    onChange={() => toggleRole(opt.value)}
                    className="accent-[#3d7a52]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {roles.includes('land_owner') && (
            <p className="rounded-[8px] bg-[#f7f7f7] px-3 py-2 text-[13px] text-[#6a6a6a]">
              Land owner accounts require admin approval before listing land for
              rent.
            </p>
          )}
          {roles.includes('specialist') && (
            <p className="rounded-[8px] bg-[#f7f7f7] px-3 py-2 text-[13px] text-[#6a6a6a]">
              Specialist accounts require admin approval before offering
              consultations.
            </p>
          )}

          {error && (
            <p className="text-[14px] text-[#c13515]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[8px] bg-[#3d7a52] px-6 py-3 text-[16px] font-medium text-white transition hover:bg-[#2a5c3b] disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-5 text-center text-[14px] text-[#6a6a6a]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#222222] underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
