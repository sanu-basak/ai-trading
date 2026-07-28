/**
 * Parses a duration string like "15m", "30d", "12h", "45s" into seconds.
 * Falls back to the provided default when the input is malformed.
 */
export function parseDurationToSeconds(input: string, fallbackSeconds: number): number {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(input.trim());
  if (!match) return fallbackSeconds;
  const value = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 1);
}
