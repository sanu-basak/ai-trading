import { useState } from 'react';
import { Bell, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { PageHeader, Card, EmptyState, Spinner } from '@/components/ui/misc';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InstrumentPicker } from '@/components/InstrumentPicker';
import { cn } from '@/lib/cn';
import { apiErrorMessage } from '@/lib/api/client';
import type { AlertOperator, Instrument } from '@/types';
import { useAlerts, useCreateAlert, useDeleteAlert, useSetAlertStatus } from './api';

const OPERATORS: { value: AlertOperator; label: string }[] = [
  { value: 'ABOVE', label: 'is above' },
  { value: 'BELOW', label: 'is below' },
  { value: 'CROSSES_ABOVE', label: 'crosses above' },
  { value: 'CROSSES_BELOW', label: 'crosses below' },
];

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'text-bull',
  PAUSED: 'text-watch',
  TRIGGERED: 'text-accent',
  EXPIRED: 'text-muted',
  DISABLED: 'text-muted',
};

export function AlertsPage() {
  const alerts = useAlerts();

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle="Get notified when price crosses your levels — delivered to the bell in real time."
      />

      <NewAlertForm />

      <Card className="mt-6 p-0">
        {alerts.isLoading ? (
          <div className="p-4">
            <Spinner />
          </div>
        ) : !alerts.data || alerts.data.length === 0 ? (
          <div className="p-4">
            <EmptyState>No alerts yet. Create one above.</EmptyState>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Repeat</th>
                <th className="px-4 py-3">Fired</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {alerts.data.map((a) => (
                <AlertRow key={a.id} alert={a} />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function AlertRow({ alert }: { alert: import('@/types').Alert }) {
  const setStatus = useSetAlertStatus();
  const remove = useDeleteAlert();
  const op = OPERATORS.find((o) => o.value === alert.condition.operator)?.label ?? alert.condition.operator;

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-4 py-3 font-medium text-slate-100">{alert.symbol}</td>
      <td className="px-4 py-3 text-muted">
        price {op} {alert.condition.value}
      </td>
      <td className={cn('px-4 py-3 font-medium', STATUS_STYLE[alert.status] ?? 'text-muted')}>
        {alert.status}
      </td>
      <td className="px-4 py-3 text-muted">{alert.isRepeating ? 'yes' : 'once'}</td>
      <td className="px-4 py-3 text-muted">{alert.triggerCount}×</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-3">
          {alert.status === 'ACTIVE' ? (
            <button
              className="text-muted hover:text-watch"
              title="Pause"
              onClick={() => setStatus.mutate({ id: alert.id, action: 'pause' })}
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              className="text-muted hover:text-bull"
              title="Resume"
              onClick={() => setStatus.mutate({ id: alert.id, action: 'resume' })}
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          <button className="text-muted hover:text-bear" title="Delete" onClick={() => remove.mutate(alert.id)}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewAlertForm() {
  const create = useCreateAlert();
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [operator, setOperator] = useState<AlertOperator>('ABOVE');
  const [value, setValue] = useState('');
  const [repeating, setRepeating] = useState(false);

  const submit = () => {
    if (!instrument || !value) return;
    const opLabel = OPERATORS.find((o) => o.value === operator)?.label ?? operator;
    create.mutate(
      {
        instrumentId: instrument.id,
        name: `${instrument.symbol} ${opLabel} ${value}`,
        operator,
        value: Number(value),
        isRepeating: repeating,
      },
      { onSuccess: () => setValue('') },
    );
  };

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-100">
        <Bell className="h-4 w-4 text-accent" /> New price alert
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <span className="label">Instrument</span>
          <InstrumentPicker value={instrument} onChange={setInstrument} />
        </div>
        <div>
          <span className="label">Condition</span>
          <select className="input" value={operator} onChange={(e) => setOperator(e.target.value as AlertOperator)}>
            {OPERATORS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Input label="Price" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Button onClick={submit} disabled={!instrument || !value} loading={create.isPending}>
          <Plus className="h-4 w-4" /> Create alert
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={repeating} onChange={(e) => setRepeating(e.target.checked)} />
          Repeat (otherwise fires once)
        </label>
        {create.isError && <span className="text-sm text-bear">{apiErrorMessage(create.error)}</span>}
      </div>
    </Card>
  );
}
