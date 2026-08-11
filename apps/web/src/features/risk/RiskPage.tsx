import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { PageHeader, Card, Stat } from '@/components/ui/misc';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { usePositionSize, useRiskProfile } from './api';

function money(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function RiskPage() {
  const profile = useRiskProfile();
  const sizer = usePositionSize();
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [target, setTarget] = useState('');
  const [account, setAccount] = useState('');
  const [riskPct, setRiskPct] = useState('');

  const run = () => {
    if (!entry || !stop) return;
    sizer.mutate({
      side,
      entry: Number(entry),
      stop: Number(stop),
      target: target ? Number(target) : null,
      accountSize: account ? Number(account) : undefined,
      riskPct: riskPct ? Number(riskPct) : undefined,
    });
  };

  const r = sizer.data;

  return (
    <div>
      <PageHeader
        title="Risk Management"
        subtitle="Size positions so a stop-out costs exactly what you decide — not a rupee more."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Calculator className="h-4 w-4 text-accent" /> Position size calculator
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className="label">Side</span>
              <select className="input" value={side} onChange={(e) => setSide(e.target.value as 'LONG' | 'SHORT')}>
                <option value="LONG">Long</option>
                <option value="SHORT">Short</option>
              </select>
            </div>
            <Input label="Entry" type="number" value={entry} onChange={(e) => setEntry(e.target.value)} />
            <Input label="Stop loss" type="number" value={stop} onChange={(e) => setStop(e.target.value)} />
            <Input label="Target (optional)" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
            <Input
              label={`Account size (default ${money(profile.data?.accountSize)})`}
              type="number"
              placeholder={profile.data ? String(profile.data.accountSize) : ''}
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
            <Input
              label={`Risk % (default ${profile.data?.maxRiskPerTradePct ?? 1}%)`}
              type="number"
              placeholder={profile.data ? String(profile.data.maxRiskPerTradePct) : ''}
              value={riskPct}
              onChange={(e) => setRiskPct(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <Button onClick={run} disabled={!entry || !stop}>
              Calculate
            </Button>
          </div>
        </Card>

        <Card>
          <div className="mb-3 text-sm font-semibold text-slate-100">Result</div>
          {!r ? (
            <p className="text-sm text-muted">Enter a trade to size it against your risk budget.</p>
          ) : (
            <>
              {r.warning && (
                <div className="mb-3 rounded-lg border border-bear/30 bg-bear/10 px-3 py-2 text-sm text-bear">
                  {r.warning}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Quantity" value={money(r.quantity)} />
                <Stat label="Risk amount" value={money(r.riskAmount)} tone="down" />
                <Stat label="Position value" value={money(r.positionValue)} />
                <Stat label="% of account" value={`${money(r.positionPctOfAccount)}%`} />
                <Stat label="Stop distance" value={`${money(r.stopDistance)} (${money(r.stopDistancePct)}%)`} />
                <Stat
                  label="Risk : reward"
                  value={r.riskReward ? `${money(r.riskReward)} : 1` : '—'}
                  tone={r.riskReward && r.riskReward >= 2 ? 'up' : undefined}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      {profile.data && (
        <Card className="mt-6">
          <div className="mb-3 text-sm font-semibold text-slate-100">Your risk profile</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Account size" value={money(profile.data.accountSize)} />
            <Stat label="Max risk / trade" value={`${profile.data.maxRiskPerTradePct}%`} />
            <Stat label="Max portfolio risk" value={`${profile.data.maxPortfolioRiskPct}%`} />
            <Stat label="Max positions" value={String(profile.data.maxOpenPositions)} />
            <Stat label="Max daily loss" value={`${profile.data.maxDailyLossPct}%`} />
            <Stat label="Max drawdown" value={`${profile.data.maxDrawdownPct}%`} />
            <Stat label="Default R:R" value={`${profile.data.defaultRiskReward} : 1`} />
            <Stat label="Sizing model" value={profile.data.positionSizingModel.replace('_', ' ')} />
          </div>
        </Card>
      )}
    </div>
  );
}
