import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RegisterPage } from '../../pages/RegisterPage'
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

function renderRegister(authCtx) {
  return render(
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/app" element={<div data-testid="app">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

async function fillAndSubmit(register) {
  renderRegister(makeAuthCtx({ register }))
  await userEvent.type(document.querySelector('input:not([type])'), 'Alice Farmer')
  await userEvent.type(document.querySelector('input[type="email"]'), 'alice@farm.com')
  await userEvent.type(document.querySelector('input[type="password"]'), 'secure123')
  fireEvent.submit(document.querySelector('form'))
}

describe('RegisterPage', () => {
  it('renders email and password fields', () => {
    renderRegister(makeAuthCtx())
    expect(document.querySelector('input[type="email"]')).toBeTruthy()
    expect(document.querySelector('input[type="password"]')).toBeTruthy()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('shows role checkboxes', () => {
    renderRegister(makeAuthCtx())
    expect(screen.getByRole('checkbox', { name: /^farmer$/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /land owner/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /specialist/i })).toBeInTheDocument()
  })

  it('calls register with correct payload on submit', async () => {
    const register = vi.fn().mockResolvedValue({ roles: ['farmer'] })
    await fillAndSubmit(register)
    await waitFor(() => {
      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'alice@farm.com', roles: expect.arrayContaining(['farmer']) })
      )
    })
  })

  it('shows error on registration failure', async () => {
    const register = vi.fn().mockRejectedValue(new Error('Email already in use'))
    await fillAndSubmit(register)
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Email already in use')
    )
  })

  it('redirects to /app when already authenticated', () => {
    renderRegister(makeAuthCtx({ user: { roles: ['farmer'] } }))
    expect(screen.getByTestId('app')).toBeInTheDocument()
  })
})
