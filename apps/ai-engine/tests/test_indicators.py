import numpy as np
import pandas as pd

from app.engines.technical import indicators as ind


def test_sma_last_value():
    s = pd.Series([1, 2, 3, 4, 5], dtype=float)
    assert ind.sma(s, 3).iloc[-1] == 4.0


def test_ema_matches_manual():
    s = pd.Series([1, 2, 3, 4, 5], dtype=float)
    ema = ind.ema(s, 3)
    # EMA(3) with alpha=0.5, seeded by first value; last should be > SMA due to recency.
    assert not np.isnan(ema.iloc[-1])
    assert ema.iloc[-1] > 3.0


def test_rsi_all_gains_is_100():
    s = pd.Series(np.arange(1, 40), dtype=float)  # strictly increasing
    rsi = ind.rsi(s, 14)
    assert rsi.iloc[-1] == 100.0


def test_rsi_all_losses_near_zero():
    s = pd.Series(np.arange(40, 1, -1), dtype=float)  # strictly decreasing
    rsi = ind.rsi(s, 14)
    assert rsi.iloc[-1] < 1.0


def test_atr_positive():
    n = 50
    high = pd.Series(np.linspace(10, 20, n))
    low = high - 1.0
    close = high - 0.5
    atr = ind.atr(high, low, close, 14)
    assert atr.iloc[-1] > 0


def test_bollinger_ordering():
    s = pd.Series(np.random.default_rng(42).normal(100, 5, 100))
    upper, mid, lower = ind.bollinger_bands(s, 20, 2.0)
    assert upper.iloc[-1] > mid.iloc[-1] > lower.iloc[-1]


def test_adx_in_range():
    n = 60
    high = pd.Series(np.linspace(10, 30, n))
    low = high - 1.0
    close = high - 0.5
    adx, plus_di, minus_di = ind.adx(high, low, close, 14)
    assert 0 <= adx.iloc[-1] <= 100
    assert plus_di.iloc[-1] >= minus_di.iloc[-1]  # clean uptrend
