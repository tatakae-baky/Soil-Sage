import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usersApi } from '../lib/api'

/**
 * Profile and account settings — uses PATCH /users/me; refreshes session user on success.
 */
export function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user?.profilePhotoUrl || '')
  const [languagePreference, setLanguagePreference] = useState(user?.languagePreference || 'en')
  const [farmLandSize, setFarmLandSize] = useState(user?.farmLandSize || '')
  const [farmSoilType, setFarmSoilType] = useState(user?.farmSoilType || '')
  const [farmCropCategory, setFarmCropCategory] = useState(user?.farmCropCategory || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    if (!user) return
    setName(user.name || '')
    setPhone(user.phone || '')
    setProfilePhotoUrl(user.profilePhotoUrl || '')
    setLanguagePreference(user.languagePreference || 'en')
    setFarmLandSize(user.farmLandSize || '')
    setFarmSoilType(user.farmSoilType || '')
    setFarmCropCategory(user.farmCropCategory || '')
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)
    try {
      const body = {
        name: name.trim(),
        phone: phone.trim(),
        profilePhotoUrl: profilePhotoUrl.trim(),
        languagePreference,
        farmLandSize: farmLandSize.trim(),
        farmSoilType: farmSoilType.trim(),
        farmCropCategory: farmCropCategory.trim(),
      }
      if (newPassword.trim()) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      }
      await usersApi.updateMe(body)
      await refreshUser()
      setMessage('Saved.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
          Settings
        </h1>
        <p className="mt-1 text-[14px] text-[#6a6a6a]">
          Update your profile. Language preference is stored for future Bangla UI; the app is
          mostly English today.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card"
      >
        <h2 className="text-[16px] font-semibold text-[#222222]">Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={name} onChange={setName} required />
          <Field label="Phone" value={phone} onChange={setPhone} />
          <div className="sm:col-span-2">
            <Field
              label="Profile photo URL"
              value={profilePhotoUrl}
              onChange={setProfilePhotoUrl}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="mb-1 block text-[14px] font-medium text-[#222222]">
              Language
            </label>
            <select
              value={languagePreference}
              onChange={(e) => setLanguagePreference(e.target.value)}
              className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222]"
            >
              <option value="en">English</option>
              <option value="bn">Bangla (preference only)</option>
            </select>
          </div>
        </div>

        <h2 className="border-t border-[#ebebeb] pt-6 text-[16px] font-semibold text-[#222222]">
          Farm details (farmers)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Farm land size" value={farmLandSize} onChange={setFarmLandSize} />
          <Field label="Soil type" value={farmSoilType} onChange={setFarmSoilType} />
          <Field
            label="Crop category"
            value={farmCropCategory}
            onChange={setFarmCropCategory}
            className="sm:col-span-2"
          />
        </div>

        <h2 className="border-t border-[#ebebeb] pt-6 text-[16px] font-semibold text-[#222222]">
          Change password
        </h2>
        <p className="text-[13px] text-[#6a6a6a]">
          Leave new password empty to keep your current password.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <Field
            label="New password (min 8)"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-[14px] text-[#c13515]">{error}</p>}
        {message && <p className="text-[14px] text-green-700">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-[8px] bg-[#ff385c] px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-[#e00b41] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, placeholder, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[14px] font-medium text-[#222222]">
        {label}
        {required && ' *'}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[8px] border border-[#dddddd] px-3 py-2.5 text-[14px] text-[#222222] outline-none focus:border-[#222222] focus:ring-2 focus:ring-[#222222]"
      />
    </div>
  )
}
