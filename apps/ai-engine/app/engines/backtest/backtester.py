"""A lightweight, honest event-driven backtester.

Runs a rule-based strategy bar-by-bar over historical candles and reports the
resulting trades, equity curve, and performance metrics. Long-only, no leverage,
no look-ahead (signals act on the next bar's open is approximated by acting on
the signal bar's close). Commissions are modelled in basis points.

This is a research tool: past performance never guarantees future results, and
the metrics come with that caveat.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from app.engines.technical import indicators as ind

# Bars per year by timeframe — used to annualize Sharpe/Sortino/CAGR.
_BARS_PER_YEAR = {
    "1m": 525_600,
    "5m": 105_120,
    "15m": 35_040,
    "30m": 17_520,
    "1h": 8_760,
    "4h": 2_190,
    "1d": 365,
    "1w": 52,
    "1M": 12,
}


@dataclass
class BtTrade:
    side: str
    entry_index: int
    entry_price: float
    exit_index: int
    exit_price: float
    quantity: float
    pnl: float
    return_pct: float
    bars_held: int


@dataclass
class EquityPoint:
    index: int
    equity: float
    drawdown_pct: float


@dataclass
class BtMetrics:
    total_return: float
    total_return_pct: float
    cagr: float | None
    win_rate: float
    profit_factor: float | None
    max_drawdown: float
    max_drawdown_pct: float
    sharpe: float | None
    sortino: float | None
    total_trades: int
    winning_trades: int
    losing_trades: int
    avg_win: float
    avg_loss: float
    expectancy: float
    exposure_pct: float


@dataclass
class BacktestResult:
    strategy: str
    initial_capital: float
    final_equity: float
    metrics: BtMetrics
    trades: list[BtTrade] = field(default_factory=list)
    equity_curve: list[EquityPoint] = field(default_factory=list)
    summary: str = ""


def _signals(df: pd.DataFrame, strategy: str, params: dict) -> tuple[pd.Series, pd.Series]:
    """Returns (entry, exit) boolean Series for a long-only strategy."""
    close = df["close"]
    if strategy == "ema_cross":
        fast = ind.ema(close, int(params.get("fast", 20)))
        slow = ind.ema(close, int(params.get("slow", 50)))
        cross_up = (fast > slow) & (fast.shift(1) <= slow.shift(1))
        cross_dn = (fast < slow) & (fast.shift(1) >= slow.shift(1))
        return cross_up.fillna(False), cross_dn.fillna(False)

    if strategy == "rsi_reversion":
        rsi = ind.rsi(close, int(params.get("period", 14)))
        oversold = float(params.get("oversold", 30))
        exit_level = float(params.get("exit", 55))
        entry = (rsi < oversold) & (rsi.shift(1) >= oversold)
        exit_ = (rsi > exit_level) & (rsi.shift(1) <= exit_level)
        return entry.fillna(False), exit_.fillna(False)

    if strategy == "supertrend":
        _, direction = ind.supertrend(
            df["high"], df["low"], close, int(params.get("period", 10)), float(params.get("multiplier", 3.0))
        )
        entry = (direction > 0) & (direction.shift(1) <= 0)
        exit_ = (direction < 0) & (direction.shift(1) >= 0)
        return entry.fillna(False), exit_.fillna(False)

    raise ValueError(f"Unknown strategy: {strategy}")


def run(
    df: pd.DataFrame,
    strategy: str = "ema_cross",
    params: dict | None = None,
    initial_capital: float = 100_000.0,
    commission_bps: float = 5.0,
    timeframe: str = "1d",
) -> BacktestResult:
    params = params or {}
    entries, exits = _signals(df, strategy, params)
    close = df["close"].to_numpy()
    n = len(df)
    commission = commission_bps / 10_000.0

    cash = initial_capital
    position_qty = 0.0
    entry_price = 0.0
    entry_index = 0
    bars_in_market = 0

    trades: list[BtTrade] = []
    equity_curve: list[EquityPoint] = []
    peak_equity = initial_capital
    max_dd_pct = 0.0
    max_dd_abs = 0.0
    equity_series: list[float] = []

    entries_arr = entries.to_numpy()
    exits_arr = exits.to_numpy()

    for i in range(n):
        price = float(close[i])

        # Exit first (avoid entering and exiting on the same bar).
        if position_qty > 0 and (exits_arr[i] or i == n - 1):
            proceeds = position_qty * price * (1 - commission)
            cash += proceeds
            cost_basis = position_qty * entry_price
            pnl = proceeds - cost_basis
            trades.append(
                BtTrade(
                    side="LONG",
                    entry_index=entry_index,
                    entry_price=round(entry_price, 6),
                    exit_index=i,
                    exit_price=round(price, 6),
                    quantity=round(position_qty, 8),
                    pnl=round(pnl, 4),
                    return_pct=round((price / entry_price - 1) * 100, 4) if entry_price else 0.0,
                    bars_held=i - entry_index,
                )
            )
            position_qty = 0.0

        # Entry.
        elif position_qty == 0 and entries_arr[i] and i < n - 1:
            invest = cash * (1 - commission)
            position_qty = invest / price if price > 0 else 0.0
            cash -= position_qty * price * (1 + commission)
            entry_price = price
            entry_index = i

        if position_qty > 0:
            bars_in_market += 1

        equity = cash + position_qty * price
        equity_series.append(equity)
        peak_equity = max(peak_equity, equity)
        dd_abs = peak_equity - equity
        dd_pct = (dd_abs / peak_equity) * 100 if peak_equity > 0 else 0.0
        max_dd_abs = max(max_dd_abs, dd_abs)
        max_dd_pct = max(max_dd_pct, dd_pct)
        equity_curve.append(EquityPoint(index=i, equity=round(equity, 4), drawdown_pct=round(dd_pct, 4)))

    final_equity = equity_series[-1] if equity_series else initial_capital
    metrics = _metrics(
        trades, equity_series, initial_capital, final_equity, max_dd_abs, max_dd_pct, bars_in_market, n, timeframe
    )
    result = BacktestResult(
        strategy=strategy,
        initial_capital=initial_capital,
        final_equity=round(final_equity, 4),
        metrics=metrics,
        trades=trades,
        equity_curve=equity_curve,
    )
    result.summary = _summary(result)
    return result


def _metrics(
    trades: list[BtTrade],
    equity_series: list[float],
    initial_capital: float,
    final_equity: float,
    max_dd_abs: float,
    max_dd_pct: float,
    bars_in_market: int,
    n: int,
    timeframe: str,
) -> BtMetrics:
    wins = [t for t in trades if t.pnl > 0]
    losses = [t for t in trades if t.pnl < 0]
    gross_profit = sum(t.pnl for t in wins)
    gross_loss = abs(sum(t.pnl for t in losses))
    total_return = final_equity - initial_capital

    # Per-bar returns for risk-adjusted ratios.
    returns = np.diff(np.array(equity_series)) / np.array(equity_series[:-1]) if len(equity_series) > 1 else np.array([])
    bars_per_year = _BARS_PER_YEAR.get(timeframe, 365)
    sharpe = sortino = None
    if returns.size > 1 and returns.std() > 0:
        sharpe = round(float(returns.mean() / returns.std() * math.sqrt(bars_per_year)), 4)
    downside = returns[returns < 0]
    if downside.size > 1 and downside.std() > 0:
        sortino = round(float(returns.mean() / downside.std() * math.sqrt(bars_per_year)), 4)

    cagr = None
    if n > 1 and initial_capital > 0 and final_equity > 0:
        years = n / bars_per_year
        if years > 0:
            cagr = round((math.pow(final_equity / initial_capital, 1 / years) - 1) * 100, 4)

    total_trades = len(trades)
    return BtMetrics(
        total_return=round(total_return, 4),
        total_return_pct=round((total_return / initial_capital) * 100, 4) if initial_capital else 0.0,
        cagr=cagr,
        win_rate=round(len(wins) / total_trades * 100, 4) if total_trades else 0.0,
        profit_factor=round(gross_profit / gross_loss, 4) if gross_loss > 0 else (None if gross_profit > 0 else 0.0),
        max_drawdown=round(max_dd_abs, 4),
        max_drawdown_pct=round(max_dd_pct, 4),
        sharpe=sharpe,
        sortino=sortino,
        total_trades=total_trades,
        winning_trades=len(wins),
        losing_trades=len(losses),
        avg_win=round(gross_profit / len(wins), 4) if wins else 0.0,
        avg_loss=round(gross_loss / len(losses), 4) if losses else 0.0,
        expectancy=round(total_return / total_trades, 4) if total_trades else 0.0,
        exposure_pct=round(bars_in_market / n * 100, 4) if n else 0.0,
    )


def _summary(r: BacktestResult) -> str:
    m = r.metrics
    return (
        f"{r.strategy}: {m.total_return_pct:+.2f}% over {m.total_trades} trades "
        f"(win rate {m.win_rate:.0f}%, profit factor "
        f"{m.profit_factor if m.profit_factor is not None else 'n/a'}, "
        f"max drawdown {m.max_drawdown_pct:.1f}%). Past performance is not indicative of future results."
    )
