import { useAuth } from '../hooks/useAuth'

/**
 * Authenticated dashboard — welcome and account context until domain APIs load.
 */
export function DashboardPage() {
  const { user } = useAuth()

  const approvalBadge = (status) => {
    const map = {
      approved: 'bg-green-50 text-green-700',
      pending: 'bg-amber-50 text-amber-700',
      rejected: 'bg-red-50 text-[#c13515]',
      not_applicable: 'bg-[#f2f2f2] text-[#6a6a6a]',
    }
    return `inline-block rounded-[14px] px-2.5 py-0.5 text-[12px] font-semibold ${map[status] || map.not_applicable}`
  }

  return (
    <div className="space-y-10">
      <div className="rounded-[20px] border border-[#ebebeb] bg-white p-6 shadow-card">
        <h1 className="text-[22px] font-semibold tracking-[-0.44px] text-[#222222]">
          Welcome, {user?.name}
        </h1>
        <p className="mt-1 text-[14px] text-[#6a6a6a]">{user?.email}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <span className={approvalBadge('approved')}>
            Roles: {(user?.roles || []).join(', ')}
          </span>
          {user?.roles?.includes('land_owner') && (
            <span className={approvalBadge(user.landOwnerApproval)}>
              Land owner: {user.landOwnerApproval}
            </span>
          )}
          {user?.roles?.includes('specialist') && (
            <span className={approvalBadge(user.specialistApproval)}>
              Specialist: {user.specialistApproval}
            </span>
          )}
        </div>
      </div>

      <p className="text-[14px] text-[#6a6a6a]">
        Land registry, rentals, communities, and inventory tools appear in the
        navigation as those features are enabled for your account.
      </p>
    </div>
  )
}
