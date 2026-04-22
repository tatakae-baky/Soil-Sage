import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../../components/ProtectedRoute'
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

function renderProtected(authCtx, roles) {
  return render(
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute roles={roles}>
                <div data-testid="children">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login">Login Page</div>} />
          <Route path="/app" element={<div data-testid="app">App Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('ProtectedRoute', () => {
  it('shows loading state while auth is loading', () => {
    renderProtected(makeAuthCtx({ loading: true }))
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('redirects to /login when no user', () => {
    renderProtected(makeAuthCtx())
    expect(screen.getByTestId('login')).toBeInTheDocument()
  })

  it('renders children when authenticated with no role requirement', () => {
    renderProtected(makeAuthCtx({ user: { roles: ['farmer'] } }))
    expect(screen.getByTestId('children')).toBeInTheDocument()
  })

  it('renders children when user has required role', () => {
    renderProtected(makeAuthCtx({ user: { roles: ['farmer'] } }), ['farmer'])
    expect(screen.getByTestId('children')).toBeInTheDocument()
  })

  it('redirects to /app when user lacks required role', () => {
    renderProtected(makeAuthCtx({ user: { roles: ['farmer'] } }), ['admin'])
    expect(screen.getByTestId('app')).toBeInTheDocument()
  })

  it('allows access if user has one of multiple allowed roles', () => {
    renderProtected(
      makeAuthCtx({ user: { roles: ['specialist'] } }),
      ['farmer', 'specialist']
    )
    expect(screen.getByTestId('children')).toBeInTheDocument()
  })
})
