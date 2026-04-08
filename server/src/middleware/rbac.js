/**
 * @param {string[]} allowedRoles
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const roles = user.roles || []
    const ok = allowedRoles.some((r) => roles.includes(r))
    if (!ok) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

/** Land owner rental features require approved land_owner role per FR. */
export function requireApprovedLandOwner(req, res, next) {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'Authentication required' })
  if (!user.roles?.includes('land_owner')) {
    return res.status(403).json({ error: 'Land owner role required' })
  }
  if (user.landOwnerApproval !== 'approved') {
    return res.status(403).json({ error: 'Land owner account pending admin approval' })
  }
  next()
}

export function requireApprovedSpecialist(req, res, next) {
  const user = req.user
  if (!user) return res.status(401).json({ error: 'Authentication required' })
  if (!user.roles?.includes('specialist')) {
    return res.status(403).json({ error: 'Specialist role required' })
  }
  if (user.specialistApproval !== 'approved') {
    return res.status(403).json({ error: 'Specialist account pending admin approval' })
  }
  next()
}

export function requireAdmin(req, res, next) {
  return requireRoles('admin')(req, res, next)
}
