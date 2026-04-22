import React, { useContext } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../../context/authContext'

const baseAuth = {
  user: null,
  loading: false,
  isAuthenticated: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshUser: vi.fn(),
}

function Consumer() {
  const ctx = useContext(AuthContext)
  return (
    <div>
      <span data-testid="user">{ctx.user ? ctx.user.name : 'null'}</span>
      <span data-testid="loading">{String(ctx.loading)}</span>
    </div>
  )
}

function renderWithAuth(ui, authValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('AuthContext', () => {
  it('provides default values when no user is set', () => {
    renderWithAuth(<Consumer />, baseAuth)
    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(screen.getByTestId('loading').textContent).toBe('false')
  })

  it('provides user when authenticated', () => {
    const authedAuth = {
      ...baseAuth,
      user: { _id: '1', name: 'John', roles: ['farmer'] },
      isAuthenticated: true,
    }
    renderWithAuth(<Consumer />, authedAuth)
    expect(screen.getByTestId('user').textContent).toBe('John')
  })
})
