import { useState, useEffect, useMemo } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useHasRole } from '../hooks/useHasRole'
import { notificationsApi } from '../lib/api'

/**
 * Authenticated shell: fixed white sidebar (grouped nav + icons), slim sticky top bar
 * (page title, notification bell). Account lives in the sidebar footer only. Mobile: drawer + hamburger.
 */

/** Human-readable title from URL for the top bar. */
function titleFromPath(pathname) {
  if (pathname === '/app' || pathname === '/app/') return 'Dashboard'
  if (pathname.startsWith('/app/notifications')) return 'Notifications'
  if (pathname.startsWith('/app/lands')) return 'Lands'
  if (pathname.startsWith('/app/rentals')) return 'Rentals'
  if (pathname.startsWith('/app/communities')) return 'Communities'
  if (pathname.startsWith('/app/discovery')) return 'Discovery'
  if (pathname.startsWith('/app/providers')) return 'Providers'
  if (pathname.startsWith('/app/inventory')) return 'Inventory'
  if (pathname.startsWith('/app/following')) return 'Following'
  if (pathname.startsWith('/app/assistant')) return 'Assistant'
  if (pathname.startsWith('/app/diagnose')) return 'Diagnose'
  if (pathname.startsWith('/app/settings')) return 'Settings'
  if (pathname.startsWith('/app/users/')) return 'Profile'
  if (pathname.startsWith('/app/admin')) return 'Admin'
  return 'Soil Sage'
}

/** Shared stroke icons (18×18) — keeps bundle free of icon libraries. */
function IconDashboard() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75A2.25 2.25 0 0115.75 18H18a2.25 2.25 0 002.25-2.25V15.75A2.25 2.25 0 0018 13.5h-2.25a2.25 2.25 0 00-2.25 2.25V15.75zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
    </svg>
  )
}
function IconLand() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.864 0 4.5 4.5 0 00-8.268 0A3.75 3.75 0 002.25 15z" />
    </svg>
  )
}
function IconRent() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M8.25 21h-4.5v-7.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M18 10.5h.008v.008H18V10.5zm-2.25 0h.008v.008H15.75V10.5z" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
}
function IconSpark() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  )
}
function IconChat() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.187.14-.396.14-.613v-.095M21 12a9 9 0 11-18 0m9 9c.984 0 1.933-.098 2.833-.28M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.09 9.09 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m0 0 .001-.193M12 12.75c-2.486 0-4.5-2.014-4.5-4.5S9.514 3.75 12 3.75s4.5 2.014 4.5 4.5-2.014 4.5-4.5 4.5z" />
    </svg>
  )
}
/** Feed / updates — used for Following. */
function IconRss() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 00-7.5-7.5H4.5m0-6h.75a7.5 7.5 0 017.5 7.5v.75m6-18a1.5 1.5 0 01-1.5 1.5h-13a1.5 1.5 0 01-1.5-1.5m16 6a1.5 1.5 0 01-1.5 1.5h-13a1.5 1.5 0 01-1.5-1.5m16 6a1.5 1.5 0 01-1.5 1.5h-13a1.5 1.5 0 01-1.5-1.5" />
    </svg>
  )
}
/** Research / articles — Discovery. */
function IconDocument() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75M8.25 21h12a1.5 1.5 0 001.5-1.5v-5.25a1.5 1.5 0 00-1.5-1.5h-9.75M8.25 21V9.75m0 11.25H4.875a1.125 1.125 0 01-1.125-1.125v-9.75a1.5 1.5 0 011.5-1.5h6.75M8.25 21L8.25 3.75" />
    </svg>
  )
}
function IconMapPin() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}
function IconShield() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}
/** Optional `className` so the same path fits the sidebar row vs. the header button. */
function IconBell({ className = 'h-5 w-5 shrink-0' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.113V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3.75 3.75 0 11-5.714 0" />
    </svg>
  )
}

function NavRow({ to, end, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg border-l-[3px] py-2.5 pl-3 pr-3 text-sm font-medium transition-colors ${
          isActive
            ? 'border-brand bg-red-50 text-brand'
            : 'border-transparent text-text-primary hover:bg-zinc-50'
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-secondary first:mt-0">
      {children}
    </p>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const isAdmin = useHasRole('admin')
  const isFarmer = useHasRole('farmer')
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const notifQ = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    staleTime: 8_000,
    /** Poll so the bell badge updates shortly after new server-side notifications. */
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
  })

  const unreadCount = useMemo(
    () => (notifQ.data?.notifications || []).filter((n) => !n.read).length,
    [notifQ.data?.notifications],
  )

  const pageTitle = titleFromPath(location.pathname)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const closeNav = () => setMobileOpen(false)

  const sidebarInner = (
    <>
      <div className="border-b border-border-light px-4 py-5">
        <Link to="/app" className="block" onClick={closeNav}>
          <span className="text-lg font-bold tracking-tight text-brand">Soil Sage</span>
          <span className="mt-0.5 block text-xs font-medium text-text-secondary">Smart farming hub</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <NavRow to="/app" end icon={<IconDashboard />} label="Dashboard" onClick={closeNav} />

        <SectionLabel>My farm</SectionLabel>
        <div className="space-y-0.5">
          <NavRow to="/app/lands" icon={<IconLand />} label="Lands" onClick={closeNav} />
          <NavRow to="/app/rentals" icon={<IconRent />} label="Rentals" onClick={closeNav} />
          <NavRow to="/app/inventory" icon={<IconBox />} label="Inventory" onClick={closeNav} />
        </div>

        {isFarmer && (
          <>
            <SectionLabel>AI tools</SectionLabel>
            <div className="space-y-0.5">
              <NavRow to="/app/diagnose" icon={<IconSpark />} label="Diagnose" onClick={closeNav} />
              <NavRow to="/app/assistant" icon={<IconChat />} label="Assistant" onClick={closeNav} />
              <NavRow to="/app/providers" icon={<IconMapPin />} label="Providers" onClick={closeNav} />
            </div>
          </>
        )}

        {!isFarmer && (
          <>
            <SectionLabel>Services</SectionLabel>
            <div className="space-y-0.5">
              <NavRow to="/app/providers" icon={<IconMapPin />} label="Providers" onClick={closeNav} />
            </div>
          </>
        )}

        <SectionLabel>Community</SectionLabel>
        <div className="space-y-0.5">
          <NavRow to="/app/communities" icon={<IconUsers />} label="Communities" onClick={closeNav} />
          {isFarmer && (
            <NavRow to="/app/following" icon={<IconRss />} label="Following" onClick={closeNav} />
          )}
          <NavRow to="/app/discovery" icon={<IconDocument />} label="Discovery" onClick={closeNav} />
        </div>

        {isAdmin && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <div className="space-y-0.5">
              <NavRow to="/app/admin" icon={<IconShield />} label="Admin panel" onClick={closeNav} />
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-border-light p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-text-primary text-sm font-semibold text-white">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">{user?.name}</p>
            <p className="truncate text-xs text-text-secondary">{user?.email}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Link
            to="/app/settings"
            onClick={closeNav}
            className="flex-1 rounded-lg border border-border bg-surface-secondary py-2 text-center text-xs font-medium text-text-primary transition hover:bg-surface-button"
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              closeNav()
              logout()
            }}
            className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-text-primary transition hover:bg-red-50 hover:text-error"
          >
            Log out
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-surface-page">
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border-light bg-sidebar md:flex">
        {sidebarInner}
      </aside>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-border-light bg-sidebar shadow-xl transition-transform duration-200 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarInner}
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-h-screen flex-1 flex-col md:pl-64">
        {/* Top bar: mobile hamburger + title + notifications (profile is sidebar-only). */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-light bg-surface px-4 md:px-6">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-text-primary md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-text-primary">
            {pageTitle}
          </h1>

          <NavLink
            to="/app/notifications"
            aria-label="Notifications"
            className={({ isActive }) =>
              `relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-text-primary transition hover:bg-surface-secondary ${
                isActive ? 'border-brand bg-red-50/60' : 'border-border'
              }`
            }
          >
            <IconBell />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
