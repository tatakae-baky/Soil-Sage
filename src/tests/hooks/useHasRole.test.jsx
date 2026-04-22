import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { useHasRole } from '../../hooks/useHasRole'
import { AuthContext } from '../../context/authContext'

function TestComponent({ role }) {
  const has = useHasRole(role)
  return <div data-testid="result">{String(has)}</div>
}

function renderWithUser(user, role) {
  return render(
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        register: vi.fn(),
        refreshUser: vi.fn(),
      }}
    >
      <MemoryRouter>
        <TestComponent role={role} />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('useHasRole', () => {
  it('returns true when user has the role', () => {
    const { getByTestId } = renderWithUser(
      { roles: ['farmer'] },
      'farmer'
    )
    expect(getByTestId('result').textContent).toBe('true')
  })

  it('returns false when user does not have the role', () => {
    const { getByTestId } = renderWithUser(
      { roles: ['farmer'] },
      'admin'
    )
    expect(getByTestId('result').textContent).toBe('false')
  })

  it('returns false when user is null', () => {
    const { getByTestId } = renderWithUser(null, 'farmer')
    expect(getByTestId('result').textContent).toBe('false')
  })

  it('returns true for specialist with specialist role', () => {
    const { getByTestId } = renderWithUser(
      { roles: ['specialist'] },
      'specialist'
    )
    expect(getByTestId('result').textContent).toBe('true')
  })
})
