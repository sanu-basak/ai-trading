import { useMemo } from 'react';
import type { EquityPoint } from '@/types';

interface Props {
  points: EquityPoint[];
  baseline: number;
}

/** A lightweight, dependency-free SVG equity-curve chart. */
export function EquityCurve({ points, baseline }: Props) {
  const { path, baselineY, min, max, width, height } = useMemo(() => {
    const W = 800;
    const H = 240;
    const pad = 8;
    const equities = points.map((p) => p.equity);
    const lo = Math.min(...equities, baseline);
    const hi = Math.max(...equities, baseline);
    const span = Math.max(hi - lo, 1e-9);
    const x = (i: number): number => pad + (i / Math.max(points.length - 1, 1)) * (W - 2 * pad);
    const y = (v: number): number => H - pad - ((v - lo) / span) * (H - 2 * pad);
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(p.equity).toFixed(2)}`).join(' ');
    return { path: d, baselineY: y(baseline), min: lo, max: hi, width: W, height: H };
  }, [points, baseline]);

  if (points.length === 0) return null;
  const ended = points[points.length - 1]?.equity ?? baseline;
  const up = ended >= baseline;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" preserveAspectRatio="none">
        {/* baseline (initial capital) */}
        <line
          x1={0}
          x2={width}
          y1={baselineY}
          y2={baselineY}
          stroke="#26313f"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <path
          d={path}
          fill="none"
          stroke={up ? '#22c55e' : '#ef4444'}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>min {min.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        <span>initial {baseline.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        <span>max {max.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </div>
    </div>
  );
}
