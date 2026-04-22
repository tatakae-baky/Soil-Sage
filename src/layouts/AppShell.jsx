import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Layers,
  Building2,
  Package,
  Sparkles,
  Leaf,
  Calendar,
  MessageCircle,
  Users,
  BookOpen,
  MapPin,
  ShieldCheck,
  Bell,
  Menu,
  Search,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useHasRole } from '../hooks/useHasRole'
import { notificationsApi } from '../lib/api'
import { NotificationsDropdown } from '../components/NotificationsDropdown'

function titleFromPath(pathname) {
  if (pathname === '/app' || pathname === '/app/') return 'Dashboard'
  if (pathname.startsWith('/app/lands')) return 'Lands'
  if (pathname.startsWith('/app/rentals')) return 'Rentals'
  if (pathname.startsWith('/app/communities/')) return 'Community'
  if (pathname.startsWith('/app/communities')) return 'Communities'
  if (pathname.startsWith('/app/discovery')) return 'Discovery'
  if (pathname.startsWith('/app/providers')) return 'Providers'
  if (pathname.startsWith('/app/inventory')) return 'Inventory'
  if (pathname.startsWith('/app/following')) return 'Following'
  if (pathname.startsWith('/app/assistant')) return 'Assistant'
  if (pathname.startsWith('/app/diagnose')) return 'Diagnose'
  if (pathname.startsWith('/app/recommendations')) return 'Crop recommendations'
  if (pathname.startsWith('/app/appointments')) return 'Appointments'
  if (pathname.startsWith('/app/settings')) return 'Settings'
  if (pathname.startsWith('/app/users/')) return 'Profile'
  if (pathname.startsWith('/app/admin')) return 'Admin'
  return 'Soil Sage'
}

function NavRow({ to, end, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-brand/10 font-semibold text-brand' : 'text-text-primary hover:bg-zinc-50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {icon}
          <span className="flex-1">{label}</span>
          {isActive && <span className="h-2 w-2 shrink-0 rounded-lg bg-brand" />}
        </>
      )}
    </NavLink>
  )
}

function TopNavLink({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? 'bg-brand/10 text-brand' : 'text-text-primary hover:bg-zinc-100'
        }`
      }
    >
      {label}
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

function MegaLinkCard({ to, Icon, title, desc, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="group rounded-xl border border-border-light bg-surface-secondary p-4 transition hover:border-brand/40 hover:bg-white"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">{desc}</p>
        </div>
      </div>
    </Link>
  )
}

function NotificationButton({ bellRef, notifOpen, unreadCount, onToggle }) {
  return (
    <button
      ref={bellRef}
      type="button"
      aria-label="Notifications"
      onClick={onToggle}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-text-primary transition hover:bg-surface-secondary ${
        notifOpen ? 'border-brand bg-red-50/60' : 'border-border'
      }`}
    >
      <Bell className="h-5 w-5 shrink-0" aria-hidden />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-lg bg-brand px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const isAdmin = useHasRole('admin')
  const isSpecialist = useHasRole('specialist')
  const isFarmer = useHasRole('farmer')
  const usesSidebarShell = isAdmin || isSpecialist
  const location = useLocation()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)

  const bellRef = useRef(null)
  const dropdownPanelRef = useRef(null)
  const megaButtonRef = useRef(null)
  const megaPanelRef = useRef(null)

  useEffect(() => {
    if (!notifOpen) return
    function handleOutside(e) {
      const inBell = bellRef.current?.contains(e.target)
      const inPanel = dropdownPanelRef.current?.contains(e.target)
      if (!inBell && !inPanel) setNotifOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [notifOpen])

  useEffect(() => {
    if (!megaOpen) return
    function handleOutside(e) {
      const inButton = megaButtonRef.current?.contains(e.target)
      const inPanel = megaPanelRef.current?.contains(e.target)
      if (!inButton && !inPanel) setMegaOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setMegaOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [megaOpen])

  const notifQ = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    staleTime: 8_000,
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
    setMegaOpen(false)
  }, [location.pathname])

  const closeNav = () => setMobileOpen(false)

  const socialMegaLinks = useMemo(() => {
    return [
      {
        to: '/app/communities',
        Icon: Users,
        title: 'Community forums',
        desc: 'Join farmer groups, ask questions, and share practical updates.',
      },
      {
        to: '/app/discovery',
        Icon: BookOpen,
        title: 'Discovery articles',
        desc: 'Read admin-posted science, alerts, and seasonal guidance.',
      },
    ]
  }, [])

  const workMegaLinks = useMemo(() => {
    const links = [
      {
        to: '/app/providers',
        Icon: MapPin,
        title: 'Providers',
        desc: 'Find nearby solution providers and browse available services.',
      },
      {
        to: '/app/appointments',
        Icon: Calendar,
        title: 'Appointments',
        desc: 'Request and track consultations with specialists.',
      },
    ]
    if (isFarmer) {
      links.push(
        {
          to: '/app/lands',
          Icon: Layers,
          title: 'Lands',
          desc: 'Manage parcels, view details, and update land information.',
        },
        {
          to: '/app/rentals',
          Icon: Building2,
          title: 'Rentals',
          desc: 'Publish or request rentals with location-aware matching.',
        },
        {
          to: '/app/inventory',
          Icon: Package,
          title: 'Inventory',
          desc: 'Track stock levels and maintain usage logs.',
        },
        {
          to: '/app/diagnose',
          Icon: Sparkles,
          title: 'Diagnose',
          desc: 'Run crop issue diagnostics from image evidence.',
        },
        {
          to: '/app/recommendations',
          Icon: Leaf,
          title: 'Recommendations',
          desc: 'Get crop suggestions and insights based on land data.',
        },
        {
          to: '/app/assistant',
          Icon: MessageCircle,
          title: 'Assistant',
          desc: 'Chat with an inventory-aware AI assistant.',
        },
      )
    }
    return links
  }, [isFarmer])

  const sidebarInner = (
    <>
      <div className="border-b border-border-light px-4 py-5">
        <Link to="/app" className="block" onClick={closeNav}>
          <span className="text-lg font-bold tracking-tight text-brand">Soil Sage</span>
          <span className="mt-0.5 block text-xs font-medium text-text-secondary">Smart farming hub</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <NavRow to="/app" end icon={<LayoutDashboard className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Dashboard" onClick={closeNav} />

        {isFarmer && (
          <>
            <SectionLabel>My farm</SectionLabel>
            <div className="space-y-0.5">
              <NavRow to="/app/lands" icon={<Layers className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Lands" onClick={closeNav} />
              <NavRow to="/app/rentals" icon={<Building2 className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Rentals" onClick={closeNav} />
              <NavRow to="/app/inventory" icon={<Package className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Inventory" onClick={closeNav} />
            </div>
          </>
        )}

        {isFarmer && (
          <>
            <SectionLabel>AI tools</SectionLabel>
            <div className="space-y-0.5">
              <NavRow to="/app/diagnose" icon={<Sparkles className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Diagnose" onClick={closeNav} />
              <NavRow to="/app/recommendations" icon={<Leaf className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Recommendations" onClick={closeNav} />
              <NavRow to="/app/appointments" icon={<Calendar className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Appointments" onClick={closeNav} />
              <NavRow to="/app/assistant" icon={<MessageCircle className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Assistant" onClick={closeNav} />
              <NavRow to="/app/providers" icon={<MapPin className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Providers" onClick={closeNav} />
            </div>
          </>
        )}

        {!isFarmer && (
          <>
            <SectionLabel>Services</SectionLabel>
            <div className="space-y-0.5">
              <NavRow to="/app/providers" icon={<MapPin className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Providers" onClick={closeNav} />
              <NavRow to="/app/appointments" icon={<Calendar className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Appointments" onClick={closeNav} />
            </div>
          </>
        )}

        <SectionLabel>Community</SectionLabel>
        <div className="space-y-0.5">
          <NavRow to="/app/communities" icon={<Users className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Communities" onClick={closeNav} />
          <NavRow to="/app/discovery" icon={<BookOpen className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Discovery" onClick={closeNav} />
        </div>

        {isAdmin && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <div className="space-y-0.5">
              <NavRow to="/app/admin" icon={<ShieldCheck className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Admin panel" onClick={closeNav} />
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-border-light p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-text-primary text-sm font-semibold text-white">
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

  if (usesSidebarShell) {
    return (
      <div className="flex min-h-screen bg-surface-page">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border-light bg-sidebar md:flex">
          {sidebarInner}
        </aside>

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

        <div className="flex min-h-screen flex-1 flex-col md:pl-64">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border-light bg-surface px-4 md:px-6">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-text-primary md:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>

            <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-text-primary">
              {pageTitle}
            </h1>

            <NotificationButton
              bellRef={bellRef}
              notifOpen={notifOpen}
              unreadCount={unreadCount}
              onToggle={() => setNotifOpen((o) => !o)}
            />
            {notifOpen && (
              <NotificationsDropdown
                onClose={() => setNotifOpen(false)}
                anchorEl={bellRef.current}
                panelRef={dropdownPanelRef}
              />
            )}
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="sticky top-0 z-30 border-b border-border-light bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-text-primary md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          <Link to="/app" className="shrink-0 text-lg font-bold tracking-tight text-brand">
            Soil Sage
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <TopNavLink to="/app" label="Overview" end />
            <TopNavLink to="/app/discovery" label="Discover" />
            <TopNavLink to="/app/communities" label="Community" />
            <button
              ref={megaButtonRef}
              type="button"
              onClick={() => setMegaOpen((o) => !o)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                megaOpen
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border text-text-primary hover:bg-surface-secondary'
              }`}
            >
              Explore
              <ChevronDown className={`h-4 w-4 transition-transform ${megaOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
          </nav>

          <label className="hidden min-w-0 flex-1 md:flex">
            <span className="flex h-10 w-full max-w-xl items-center gap-2 rounded-lg border border-border-light bg-surface-secondary px-3">
              <Search className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
              <input
                type="text"
                placeholder="Search people, topics, and communities"
                className="h-full w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
              />
            </span>
          </label>

          <div className="ml-auto flex items-center gap-2">
            <NotificationButton
              bellRef={bellRef}
              notifOpen={notifOpen}
              unreadCount={unreadCount}
              onToggle={() => setNotifOpen((o) => !o)}
            />

            <Link
              to="/app/settings"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-xs font-semibold text-text-primary transition hover:bg-surface-secondary"
              title="Settings"
            >
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </Link>
          </div>
        </div>
      </header>

      {notifOpen && (
        <NotificationsDropdown
          onClose={() => setNotifOpen(false)}
          anchorEl={bellRef.current}
          panelRef={dropdownPanelRef}
        />
      )}

      {megaOpen && (
        <div className="relative z-20 hidden md:block">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div ref={megaPanelRef} className="mt-3 rounded-2xl border border-border-light bg-surface p-5 shadow-card">
              <div className="space-y-5">
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Workspace</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {workMegaLinks.map((item) => (
                      <MegaLinkCard
                        key={item.to}
                        to={item.to}
                        Icon={item.Icon}
                        title={item.title}
                        desc={item.desc}
                        onClick={() => setMegaOpen(false)}
                      />
                    ))}
                  </div>
                </section>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-border-light bg-surface-secondary px-4 py-3">
                <p className="text-xs text-text-secondary">
                  Signed in as <span className="font-semibold text-text-primary">{user?.email}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    to="/app/settings"
                    onClick={() => setMegaOpen(false)}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-surface-button"
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-red-50 hover:text-error"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[88vw] flex-col border-r border-border-light bg-sidebar shadow-xl transition-transform duration-200 md:hidden ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="border-b border-border-light px-4 py-5">
              <Link to="/app" className="block" onClick={closeNav}>
                <span className="text-lg font-bold tracking-tight text-brand">Soil Sage</span>
                <span className="mt-0.5 block text-xs font-medium text-text-secondary">Smart farming hub</span>
              </Link>
            </div>

            <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
              <NavRow to="/app" end icon={<LayoutDashboard className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Overview" onClick={closeNav} />

              <SectionLabel>Community</SectionLabel>
              <div className="space-y-0.5">
                <NavRow to="/app/discovery" icon={<BookOpen className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Discovery" onClick={closeNav} />
                <NavRow to="/app/communities" icon={<Users className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Communities" onClick={closeNav} />
              </div>

              <SectionLabel>Services</SectionLabel>
              <div className="space-y-0.5">
                <NavRow to="/app/providers" icon={<MapPin className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Providers" onClick={closeNav} />
                <NavRow to="/app/appointments" icon={<Calendar className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Appointments" onClick={closeNav} />
              </div>

              {isFarmer && (
                <>
                  <SectionLabel>My farm</SectionLabel>
                  <div className="space-y-0.5">
                    <NavRow to="/app/lands" icon={<Layers className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Lands" onClick={closeNav} />
                    <NavRow to="/app/rentals" icon={<Building2 className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Rentals" onClick={closeNav} />
                    <NavRow to="/app/inventory" icon={<Package className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Inventory" onClick={closeNav} />
                    <NavRow to="/app/diagnose" icon={<Sparkles className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Diagnose" onClick={closeNav} />
                    <NavRow to="/app/recommendations" icon={<Leaf className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Recommendations" onClick={closeNav} />
                    <NavRow to="/app/assistant" icon={<MessageCircle className="h-[18px] w-[18px] shrink-0" aria-hidden />} label="Assistant" onClick={closeNav} />
                  </div>
                </>
              )}
            </nav>

            <div className="border-t border-border-light p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-text-primary text-sm font-semibold text-white">
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
          </aside>
        </>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <Outlet />
      </main>
    </div>
  )
}

