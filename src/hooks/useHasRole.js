import { useAuth } from './useAuth'

/**
 * Role check for UI gates; the API still enforces RBAC.
 * @param {string} role
 */
export function useHasRole(role) {
  const { user } = useAuth()
  return Boolean(user?.roles?.includes(role))
}
