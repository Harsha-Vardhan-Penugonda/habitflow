import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { HomeIcon, ListIcon, LogoutIcon } from './icons'
import { Logo } from './Logo'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Today', icon: HomeIcon },
  { to: '/habits', label: 'Habits', icon: ListIcon },
]

/** The shell around every logged-in page: header, navigation and content. */
export function Layout() {
  const { user, displayName, signOut } = useAuth()
  const toast = useToast()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      toast.success('You have been logged out.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4 sm:gap-6 sm:px-6">
          <NavLink to="/dashboard" className="shrink-0" aria-label="HabitFlow home">
            <Logo />
          </NavLink>
          <nav aria-label="Main" className="flex flex-1 items-center gap-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-slate-900">{displayName}</p>
              <p className="text-xs leading-tight text-slate-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
            >
              <LogoutIcon className="size-4" />
              <span className="hidden sm:inline">Log out</span>
              <span className="sr-only sm:hidden">Log out</span>
            </button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
