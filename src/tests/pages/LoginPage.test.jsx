import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LoginPage } from '../../pages/LoginPage'
import { AuthContext } from '../../context/authContext'

function makeAuthCtx(overrides = {}) {
  return {
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    refreshUser: vi.fn(),
    ...overrides,
  }
}

function renderLogin(authCtx) {
  return render(
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div data-testid="app">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    renderLogin(makeAuthCtx())
    expect(document.querySelector('input[type="email"]')).toBeTruthy()
    expect(document.querySelector('input[type="password"]')).toBeTruthy()
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('calls login with email and password on submit', async () => {
    const login = vi.fn().mockResolvedValue({ roles: ['farmer'] })
    renderLogin(makeAuthCtx({ login }))

    const emailInput = document.querySelector('input[type="email"]')
    const passwordInput = document.querySelector('input[type="password"]')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'password123')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => expect(login).toHaveBeenCalledWith('test@example.com', 'password123'))
  })

  it('shows error message on failed login', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Invalid credentials'))
    renderLogin(makeAuthCtx({ login }))

    const emailInput = document.querySelector('input[type="email"]')
    const passwordInput = document.querySelector('input[type="password"]')
    await userEvent.type(emailInput, 'bad@email.com')
    await userEvent.type(passwordInput, 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
    )
  })

  it('redirects to /app when already authenticated', () => {
    renderLogin(makeAuthCtx({ user: { roles: ['farmer'] } }))
    expect(screen.getByTestId('app')).toBeInTheDocument()
  })
})
