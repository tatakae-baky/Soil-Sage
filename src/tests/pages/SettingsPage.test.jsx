import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SettingsPage } from '../../pages/SettingsPage'
import { AuthContext } from '../../context/authContext'
import { usersApi } from '../../lib/api'

function makeAuthCtx(overrides = {}) {
  return {
    user: {
      _id: 'u1',
      name: 'Alice Farmer',
      email: 'alice@example.com',
      roles: ['farmer'],
      phone: '01700000000',
      profilePhotoUrl: '',
      languagePreference: 'en',
      farmLandSize: '3 acres',
      farmSoilType: 'Loamy',
      farmCropCategory: 'Rice',
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    refreshUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderSettings(authCtx) {
  return render(
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter initialEntries={['/app/settings']}>
        <Routes>
          <Route path="/app/settings" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.spyOn(usersApi, 'updateMe').mockResolvedValue({ user: {} })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('disables save and reset when there are no unsaved changes', () => {
    renderSettings(makeAuthCtx())

    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled()
  })

  it('shows local validation errors for invalid password change', async () => {
    renderSettings(makeAuthCtx())

    await userEvent.type(
      screen.getByLabelText(/^new password$/i),
      'new-password-123'
    )
    await userEvent.type(
      screen.getByLabelText(/^confirm new password$/i),
      'different-password-123'
    )
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    expect(screen.getByText(/current password is required/i)).toBeInTheDocument()
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(usersApi.updateMe).not.toHaveBeenCalled()
  })

  it('submits only changed, trimmed profile fields and refreshes user', async () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined)
    renderSettings(makeAuthCtx({ refreshUser }))

    const nameInput = screen.getByLabelText(/^name/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, '   Alice Cooper   ')

    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(usersApi.updateMe).toHaveBeenCalledWith({ name: 'Alice Cooper' })
    )
    expect(refreshUser).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/settings saved/i)).toBeInTheDocument()
  })

  it('hides farm details for non-farmer roles', () => {
    renderSettings(
      makeAuthCtx({
        user: {
          _id: 'u2',
          name: 'Sam Specialist',
          email: 'sam@example.com',
          roles: ['specialist'],
          phone: '',
          profilePhotoUrl: '',
          languagePreference: 'en',
          farmLandSize: '',
          farmSoilType: '',
          farmCropCategory: '',
        },
      })
    )

    expect(screen.queryByText(/farm details/i)).not.toBeInTheDocument()
  })
})
