import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Authenticated app shell — Airbnb-style white sticky header,
 * brand accent, warm near-black text, generous spacing.
 */
export function AppShell() {
  const { user, logout } = useAuth()

  const base =
    'rounded-[8px] px-4 py-2 text-sm font-medium transition-colors'
  const linkClass = ({ isActive }) =>
    `${base} ${
      isActive
        ? 'bg-[#ff385c] text-white'
        : 'text-[#222222] hover:bg-[#f2f2f2]'
    }`

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-30 border-b border-[#ebebeb] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <Link
            to="/app"
            className="text-xl font-bold tracking-tight text-[#ff385c]"
          >
            Soil Sage
          </Link>

          <nav className="flex flex-wrap items-center gap-1">
            <NavLink to="/app" end className={linkClass}>
              Dashboard
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#222222] text-xs font-semibold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className="text-sm font-medium text-[#222222]">
              {user?.name}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-[8px] border border-[#dddddd] px-3 py-1.5 text-sm font-medium text-[#222222] transition-colors hover:bg-[#f2f2f2]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content area ── */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
