import { Link } from 'react-router-dom';
import { Sparkles, Search, Star, LineChart, ArrowRight } from 'lucide-react';
import { PageHeader, Card, SignalBadge, EmptyState } from '@/components/ui/misc';
import { useAuthStore } from '@/stores/auth.store';
import { useSignals } from '@/features/ai-analysis/api';

const ACTIONS = [
  { to: '/analyze', label: 'Analyze an instrument', desc: 'Get an explainable AI signal', icon: Sparkles },
  { to: '/instruments', label: 'Browse instruments', desc: 'Search markets', icon: Search },
  { to: '/watchlists', label: 'Watchlists', desc: 'Track what matters', icon: Star },
  { to: '/paper', label: 'Paper trade', desc: 'Practice with live prices', icon: LineChart },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const signals = useSignals();

  return (
    <div>
      <PageHeader
        title={`Welcome${user?.firstName ? `, ${user.firstName}` : ''}`}
        subtitle="Your AI trading analysis workspace. Analysis only — never a guarantee."
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map(({ to, label, desc, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="group h-full transition-colors hover:border-accent/50">
              <Icon className="mb-3 h-5 w-5 text-accent" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{label}</div>
                  <div className="text-xs text-muted">{desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Recent signals</h2>
      {!signals.data || signals.data.length === 0 ? (
        <EmptyState>
          No signals yet.{' '}
          <Link to="/analyze" className="text-accent hover:underline">
            Run your first analysis
          </Link>
          .
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {signals.data.slice(0, 8).map((s) => (
            <Link
              key={s.id}
              to={`/analyze?instrumentId=${s.instrumentId}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm hover:border-accent/40"
            >
              <div className="flex items-center gap-3">
                <SignalBadge type={s.type} />
                <span className="font-medium text-slate-100">{s.symbol}</span>
                <span className="text-muted">{s.timeframe}</span>
              </div>
              <span className="text-muted">{s.confidence.toFixed(0)}%</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
