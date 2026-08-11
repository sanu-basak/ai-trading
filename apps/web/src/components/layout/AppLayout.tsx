import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Sparkles,
  Star,
  LineChart,
  BookOpen,
  FlaskConical,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/stores/auth.store';
import { useLogout } from '@/features/auth/api';
import { NotificationsBell } from '@/features/notifications/NotificationsBell';
import { useNotificationsSocket } from '@/features/notifications/useNotificationsSocket';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/instruments', label: 'Instruments', icon: Search },
  { to: '/analyze', label: 'AI Analysis', icon: Sparkles },
  { to: '/watchlists', label: 'Watchlists', icon: Star },
  { to: '/paper', label: 'Paper Trading', icon: LineChart },
  { to: '/journal', label: 'Trade Journal', icon: BookOpen },
  { to: '/backtest', label: 'Backtesting', icon: FlaskConical },
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  useNotificationsSocket();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="px-5 py-5 text-lg font-bold tracking-tight text-slate-100">
          DEV<span className="text-accent">QUANTIC</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-surface-2 hover:text-slate-200',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 px-2 text-xs text-muted">
            <div className="truncate font-medium text-slate-300">
              {user?.displayName ?? user?.email}
            </div>
            <div className="truncate">{user?.roles?.join(', ')}</div>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-slate-200"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-2.5 backdrop-blur md:px-8">
          <span className="text-sm font-semibold text-slate-100 md:hidden">
            DEV<span className="text-accent">QUANTIC</span>
          </span>
          <span className="hidden md:block" />
          <NotificationsBell />
        </header>
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
