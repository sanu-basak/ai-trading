import { PageHeader, Card, Spinner } from '@/components/ui/misc';
import type { Settings } from '@/types';
import { useSettings, useUpdateSettings } from './api';

const TIMEFRAMES = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];
const MARKETS = ['NSE', 'BSE', 'BINANCE', 'NASDAQ', 'NYSE'];

export function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const s = settings.data;

  const set = (patch: Partial<Settings>) => update.mutate(patch);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Preferences for your workspace." />
      {!s ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-4 text-sm font-semibold text-slate-100">Appearance &amp; defaults</div>
            <div className="grid gap-4">
              <Field label="Theme">
                <select className="input" value={s.theme} onChange={(e) => set({ theme: e.target.value })}>
                  <option value="system">System</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </Field>
              <Field label="Base currency">
                <select className="input" value={s.baseCurrency} onChange={(e) => set({ baseCurrency: e.target.value })}>
                  {['INR', 'USD', 'EUR', 'GBP'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Default market">
                <select className="input" value={s.defaultMarket} onChange={(e) => set({ defaultMarket: e.target.value })}>
                  {MARKETS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Default timeframe">
                <select className="input" value={s.defaultTimeframe} onChange={(e) => set({ defaultTimeframe: e.target.value })}>
                  {TIMEFRAMES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Chart type">
                <select className="input" value={s.chartType} onChange={(e) => set({ chartType: e.target.value })}>
                  {['candles', 'line', 'area', 'bars'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card>
            <div className="mb-4 text-sm font-semibold text-slate-100">Notifications</div>
            <div className="grid gap-3">
              <Toggle label="Email notifications" checked={s.emailNotifications} onChange={(v) => set({ emailNotifications: v })} />
              <Toggle label="Push notifications" checked={s.pushNotifications} onChange={(v) => set({ pushNotifications: v })} />
              <Toggle label="Product &amp; marketing emails" checked={s.marketingOptIn} onChange={(v) => set({ marketingOptIn: v })} />
            </div>
            {update.isPending && <p className="mt-4 text-xs text-muted">Saving…</p>}
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm">
      <span className="text-slate-200">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-accent" />
    </label>
  );
}
