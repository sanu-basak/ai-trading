import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { DISCLAIMER } from '@/lib/config';

export function AuthLayout() {
  const status = useAuthStore((s) => s.status);
  if (status === 'authenticated') return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-tight text-slate-100">
            DEV<span className="text-accent">QUANTIC</span>
          </div>
          <p className="mt-1 text-sm text-muted">AI Trading Analyst</p>
        </div>
        <Outlet />
        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted">{DISCLAIMER}</p>
      </div>
    </div>
  );
}
