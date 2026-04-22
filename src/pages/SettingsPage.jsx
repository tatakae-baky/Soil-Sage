import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usersApi } from '../lib/api'

/**
 * Profile and account settings - PATCH /users/me with local validation and diffed payload.
 */
export function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [status, setStatus] = useState({ tone: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const [profile, setProfile] = useState(() => profileFromUser(user))
  const [initialProfile, setInitialProfile] = useState(() => profileFromUser(user))
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const isFarmer = Boolean(user?.roles?.includes('farmer'))

  useEffect(() => {
    const nextProfile = profileFromUser(user)
    setProfile(nextProfile)
    setInitialProfile(nextProfile)
    setPasswords({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setErrors({})
    setStatus({ tone: '', text: '' })
  }, [user])

  const profilePayload = useMemo(
    () => diffProfile(initialProfile, profile),
    [initialProfile, profile]
  )
  const hasPasswordInput = useMemo(
    () =>
      Boolean(
        passwords.currentPassword || passwords.newPassword || passwords.confirmPassword
      ),
    [passwords]
  )
  const hasChanges = Object.keys(profilePayload).length > 0 || hasPasswordInput

  function clearFeedback() {
    if (status.text) setStatus({ tone: '', text: '' })
  }

  function setProfileField(field, value) {
    clearFeedback()
    setProfile((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function setPasswordField(field, value) {
    clearFeedback()
    setPasswords((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    clearFeedback()

    const nextErrors = validate(profile, passwords)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setStatus({ tone: 'error', text: 'Fix the highlighted fields and try again.' })
      return
    }

    if (!hasChanges) {
      setStatus({ tone: 'info', text: 'No changes to save.' })
      return
    }

    setSaving(true)
    try {
      const body = { ...profilePayload }
      if (passwords.newPassword.trim()) {
        body.currentPassword = passwords.currentPassword
        body.newPassword = passwords.newPassword
      }
      await usersApi.updateMe(body)
      await refreshUser()
      const normalized = normalizeProfile(profile)
      setProfile(normalized)
      setInitialProfile(normalized)
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setErrors({})
      setStatus({ tone: 'success', text: 'Settings saved.' })
    } catch (err) {
      setStatus({ tone: 'error', text: err.message || 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setProfile(initialProfile)
    setPasswords({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    setErrors({})
    setStatus({ tone: '', text: '' })
  }

  if (!user) {
    return <p className="text-[14px] text-[#6a6a6a]">Loading settings...</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
          Settings
        </h1>
        <p className="mt-1 text-[14px] text-[#6a6a6a]">
          Manage your account details, profile information, and password from one place.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card"
        noValidate
      >
        <section className="rounded-[14px] border border-[#ebebeb] bg-[#fafafa] p-4">
          <h2 className="text-[16px] font-semibold text-[#222222]">Account</h2>
          <div className="mt-3 flex items-center gap-4">
            <AvatarPreview name={profile.name} profilePhotoUrl={profile.profilePhotoUrl} />
            <div>
              <p className="text-[14px] font-semibold text-[#222222]">
                {profile.name || 'Unnamed user'}
              </p>
              <p className="text-[13px] text-[#6a6a6a]">{user.email}</p>
              <p className="mt-1 text-[12px] text-[#6a6a6a]">
                Roles: {(user.roles || []).join(', ') || 'None'}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[16px] font-semibold text-[#222222]">Profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="settings-name"
              label="Name"
              value={profile.name}
              onChange={(v) => setProfileField('name', v)}
              required
              maxLength={80}
              error={errors.name}
              autoComplete="name"
            />
            <Field
              id="settings-phone"
              label="Phone"
              value={profile.phone}
              onChange={(v) => setProfileField('phone', v)}
              type="tel"
              maxLength={32}
              error={errors.phone}
              autoComplete="tel"
            />
            <div className="sm:col-span-2">
              <Field
                id="settings-profile-photo-url"
                label="Profile photo URL"
                value={profile.profilePhotoUrl}
                onChange={(v) => setProfileField('profilePhotoUrl', v)}
                type="url"
                maxLength={500}
                error={errors.profilePhotoUrl}
                placeholder="https://example.com/photo.jpg"
              />
            </div>
            <div>
              <label
                htmlFor="settings-language"
                className="mb-1 block text-[14px] font-medium text-[#222222]"
              >
                Language
              </label>
              <select
                id="settings-language"
                value={profile.languagePreference}
                onChange={(e) => setProfileField('languagePreference', e.target.value)}
                className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222]"
              >
                <option value="en">English</option>
                <option value="bn">Bangla (preference only)</option>
              </select>
            </div>
          </div>
        </section>

        {isFarmer && (
          <section className="space-y-4 border-t border-[#ebebeb] pt-6">
            <h2 className="text-[16px] font-semibold text-[#222222]">Farm details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="settings-farm-land-size"
                label="Farm land size"
                value={profile.farmLandSize}
                onChange={(v) => setProfileField('farmLandSize', v)}
                maxLength={80}
                error={errors.farmLandSize}
                autoComplete="off"
              />
              <Field
                id="settings-farm-soil-type"
                label="Soil type"
                value={profile.farmSoilType}
                onChange={(v) => setProfileField('farmSoilType', v)}
                maxLength={80}
                error={errors.farmSoilType}
                autoComplete="off"
              />
              <Field
                id="settings-farm-crop-category"
                label="Crop category"
                value={profile.farmCropCategory}
                onChange={(v) => setProfileField('farmCropCategory', v)}
                maxLength={80}
                error={errors.farmCropCategory}
                className="sm:col-span-2"
                autoComplete="off"
              />
            </div>
          </section>
        )}

        <section className="space-y-4 border-t border-[#ebebeb] pt-6">
          <h2 className="text-[16px] font-semibold text-[#222222]">
            Change password
          </h2>
          <p className="text-[13px] text-[#6a6a6a]">
            Leave all password fields empty to keep your current password.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="settings-current-password"
              label="Current password"
              type="password"
              value={passwords.currentPassword}
              onChange={(v) => setPasswordField('currentPassword', v)}
              autoComplete="current-password"
              error={errors.currentPassword}
            />
            <Field
              id="settings-new-password"
              label="New password"
              type="password"
              value={passwords.newPassword}
              onChange={(v) => setPasswordField('newPassword', v)}
              autoComplete="new-password"
              minLength={8}
              error={errors.newPassword}
            />
            <Field
              id="settings-confirm-password"
              label="Confirm new password"
              type="password"
              value={passwords.confirmPassword}
              onChange={(v) => setPasswordField('confirmPassword', v)}
              autoComplete="new-password"
              error={errors.confirmPassword}
              className="sm:col-span-2"
            />
          </div>
        </section>

        {status.text && (
          <p
            className={`text-[14px] ${
              status.tone === 'error'
                ? 'text-[#c13515]'
                : status.tone === 'success'
                  ? 'text-green-700'
                  : 'text-[#6a6a6a]'
            }`}
            role={status.tone === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {status.text}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!hasChanges || saving}
            className="rounded-[8px] bg-[#3d7a52] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#2a5c3b] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="rounded-[8px] border border-[#dddddd] px-5 py-2.5 text-[14px] font-medium text-[#222222] transition hover:bg-[#f7f7f7] disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  )
}

function AvatarPreview({ name, profilePhotoUrl }) {
  const [failedSrc, setFailedSrc] = useState('')
  const src = profilePhotoUrl.trim()

  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const showImage = Boolean(src) && src !== failedSrc

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#222222] text-xl font-semibold text-white">
      {showImage ? (
        <img
          src={src}
          alt="Profile"
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        initial
      )}
    </div>
  )
}
function profileFromUser(user) {
  return normalizeProfile({
    name: user?.name || '',
    phone: user?.phone || '',
    profilePhotoUrl: user?.profilePhotoUrl || '',
    languagePreference: user?.languagePreference || 'en',
    farmLandSize: user?.farmLandSize || '',
    farmSoilType: user?.farmSoilType || '',
    farmCropCategory: user?.farmCropCategory || '',
  })
}

function normalizeProfile(profile) {
  return {
    name: String(profile.name || '').trim(),
    phone: String(profile.phone || '').trim(),
    profilePhotoUrl: String(profile.profilePhotoUrl || '').trim(),
    languagePreference: profile.languagePreference === 'bn' ? 'bn' : 'en',
    farmLandSize: String(profile.farmLandSize || '').trim(),
    farmSoilType: String(profile.farmSoilType || '').trim(),
    farmCropCategory: String(profile.farmCropCategory || '').trim(),
  }
}

function diffProfile(initialProfile, currentProfile) {
  const initial = normalizeProfile(initialProfile)
  const current = normalizeProfile(currentProfile)
  const payload = {}

  for (const key of Object.keys(current)) {
    if (current[key] !== initial[key]) {
      payload[key] = current[key]
    }
  }

  return payload
}

function validate(profile, passwords) {
  const errors = {}
  const normalized = normalizeProfile(profile)
  const currentPassword = passwords.currentPassword
  const newPassword = passwords.newPassword
  const confirmPassword = passwords.confirmPassword
  const hasPasswordInput = Boolean(currentPassword || newPassword || confirmPassword)

  if (!normalized.name) {
    errors.name = 'Name is required.'
  } else if (normalized.name.length > 80) {
    errors.name = 'Name must be 80 characters or fewer.'
  }

  if (normalized.phone.length > 32) {
    errors.phone = 'Phone must be 32 characters or fewer.'
  }

  if (normalized.profilePhotoUrl.length > 500) {
    errors.profilePhotoUrl = 'Profile photo URL is too long.'
  } else if (normalized.profilePhotoUrl && !isHttpUrl(normalized.profilePhotoUrl)) {
    errors.profilePhotoUrl = 'Profile photo URL must start with http:// or https://.'
  }

  if (normalized.farmLandSize.length > 80) {
    errors.farmLandSize = 'Farm land size must be 80 characters or fewer.'
  }
  if (normalized.farmSoilType.length > 80) {
    errors.farmSoilType = 'Soil type must be 80 characters or fewer.'
  }
  if (normalized.farmCropCategory.length > 80) {
    errors.farmCropCategory = 'Crop category must be 80 characters or fewer.'
  }

  if (hasPasswordInput) {
    if (!currentPassword) {
      errors.currentPassword = 'Current password is required.'
    }
    if (!newPassword) {
      errors.newPassword = 'Enter a new password.'
    } else if (newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters.'
    } else if (currentPassword && newPassword === currentPassword) {
      errors.newPassword = 'New password must be different from current password.'
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your new password.'
    } else if (newPassword && confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
  }

  return errors
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  className = '',
  error,
  minLength,
  maxLength,
  autoComplete,
}) {
  const describedBy = error ? `${id}-error` : undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[14px] font-medium text-[#222222]">
        {label}
        {required && ' *'}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        autoComplete={autoComplete}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`w-full rounded-[8px] border px-3 py-2.5 text-[14px] text-[#222222] outline-none focus:ring-2 ${
          error
            ? 'border-[#c13515] focus:border-[#c13515] focus:ring-[#c13515]'
            : 'border-[#dddddd] focus:border-[#222222] focus:ring-[#222222]'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[12px] text-[#c13515]">
          {error}
        </p>
      )}
    </div>
  )
}
