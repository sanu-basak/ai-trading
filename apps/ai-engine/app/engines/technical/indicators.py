"""Technical indicators implemented in-house with NumPy/pandas.

All functions are pure and operate on pandas Series/DataFrames. They use Wilder's
smoothing where the classic definition calls for it (RSI, ATR, ADX), matching the
values traders expect from standard charting platforms. No third-party TA library
is required.
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def sma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(window=period, min_periods=period).mean()


def ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False, min_periods=period).mean()


def _wilder(series: pd.Series, period: int) -> pd.Series:
    """Wilder's smoothing == EMA with alpha = 1/period."""
    return series.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = _wilder(gain, period)
    avg_loss = _wilder(loss, period)
    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    out = 100.0 - (100.0 / (1.0 + rs))
    # When average loss is zero (pure uptrend), RSI is 100.
    out = out.where(avg_loss != 0.0, 100.0)
    return out


def macd(
    close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    macd_line = ema(close, fast) - ema(close, slow)
    signal_line = macd_line.ewm(span=signal, adjust=False, min_periods=signal).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def true_range(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    prev_close = close.shift(1)
    ranges = pd.concat(
        [(high - low), (high - prev_close).abs(), (low - prev_close).abs()], axis=1
    )
    return ranges.max(axis=1)


def atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    return _wilder(true_range(high, low, close), period)


def adx(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Returns (ADX, +DI, -DI)."""
    up_move = high.diff()
    down_move = -low.diff()
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
    plus_dm = pd.Series(plus_dm, index=high.index)
    minus_dm = pd.Series(minus_dm, index=high.index)

    atr_ = _wilder(true_range(high, low, close), period)
    plus_di = 100.0 * _wilder(plus_dm, period) / atr_.replace(0.0, np.nan)
    minus_di = 100.0 * _wilder(minus_dm, period) / atr_.replace(0.0, np.nan)
    di_sum = (plus_di + minus_di).replace(0.0, np.nan)
    dx = 100.0 * (plus_di - minus_di).abs() / di_sum
    adx_ = _wilder(dx, period)
    return adx_, plus_di, minus_di


def bollinger_bands(
    close: pd.Series, period: int = 20, num_std: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Returns (upper, middle, lower)."""
    middle = sma(close, period)
    std = close.rolling(window=period, min_periods=period).std(ddof=0)
    upper = middle + num_std * std
    lower = middle - num_std * std
    return upper, middle, lower


def vwap(
    high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series
) -> pd.Series:
    typical = (high + low + close) / 3.0
    cum_vol = volume.cumsum().replace(0.0, np.nan)
    return (typical * volume).cumsum() / cum_vol


def stochastic(
    high: pd.Series, low: pd.Series, close: pd.Series, k: int = 14, d: int = 3
) -> tuple[pd.Series, pd.Series]:
    """Returns (%K, %D)."""
    lowest = low.rolling(window=k, min_periods=k).min()
    highest = high.rolling(window=k, min_periods=k).max()
    denom = (highest - lowest).replace(0.0, np.nan)
    percent_k = 100.0 * (close - lowest) / denom
    percent_d = percent_k.rolling(window=d, min_periods=d).mean()
    return percent_k, percent_d


def supertrend(
    high: pd.Series, low: pd.Series, close: pd.Series, period: int = 10, multiplier: float = 3.0
) -> tuple[pd.Series, pd.Series]:
    """Returns (supertrend_line, direction) where direction is +1 up, -1 down."""
    atr_ = atr(high, low, close, period)
    hl2 = (high + low) / 2.0
    upper_basic = hl2 + multiplier * atr_
    lower_basic = hl2 + -multiplier * atr_

    n = len(close)
    final_upper = np.full(n, np.nan)
    final_lower = np.full(n, np.nan)
    st = np.full(n, np.nan)
    direction = np.full(n, 1.0)

    ub = upper_basic.to_numpy()
    lb = lower_basic.to_numpy()
    c = close.to_numpy()

    for i in range(n):
        if i == 0 or np.isnan(ub[i]) or np.isnan(lb[i]):
            final_upper[i] = ub[i]
            final_lower[i] = lb[i]
            st[i] = ub[i]
            direction[i] = 1.0
            continue
        final_upper[i] = (
            ub[i] if (ub[i] < final_upper[i - 1] or c[i - 1] > final_upper[i - 1]) else final_upper[i - 1]
        )
        final_lower[i] = (
            lb[i] if (lb[i] > final_lower[i - 1] or c[i - 1] < final_lower[i - 1]) else final_lower[i - 1]
        )
        if c[i] > final_upper[i]:
            direction[i] = 1.0
        elif c[i] < final_lower[i]:
            direction[i] = -1.0
        else:
            direction[i] = direction[i - 1]
        st[i] = final_lower[i] if direction[i] > 0 else final_upper[i]

    return (
        pd.Series(st, index=close.index),
        pd.Series(direction, index=close.index),
    )
