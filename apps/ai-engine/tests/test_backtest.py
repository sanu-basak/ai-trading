import numpy as np
import pandas as pd
import pytest

from app.engines.backtest import backtester


def _df(closes: np.ndarray) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "open": np.concatenate([[closes[0]], closes[:-1]]),
            "high": closes + 0.5,
            "low": closes - 0.5,
            "close": closes,
            "volume": np.full(len(closes), 1000.0),
        }
    )


def test_equity_curve_length_matches_candles():
    df = _df(np.linspace(100, 140, 200))
    r = backtester.run(df, "ema_cross", {"fast": 10, "slow": 30}, 100_000, 5, "1d")
    assert len(r.equity_curve) == len(df)
    assert r.metrics.total_trades >= 0


def test_uptrend_ema_cross_is_profitable():
    # An oscillating uptrend produces a golden cross the strategy can ride.
    x = np.linspace(0, 24, 300)
    closes = 100 + 15 * np.sin(x / 3) + x
    r = backtester.run(_df(closes), "ema_cross", {"fast": 10, "slow": 30}, 100_000, 5, "1d")
    assert r.final_equity > r.initial_capital
    assert r.metrics.total_return_pct > 0
    assert r.metrics.max_drawdown_pct >= 0


def test_metrics_fields_present():
    df = _df(np.linspace(100, 120, 200))
    m = backtester.run(df, "ema_cross", {}, 100_000, 5, "1d").metrics
    for field in ("win_rate", "profit_factor", "max_drawdown_pct", "sharpe", "expectancy", "exposure_pct"):
        assert hasattr(m, field)
    assert 0 <= m.exposure_pct <= 100


def test_unknown_strategy_raises():
    df = _df(np.linspace(100, 120, 100))
    with pytest.raises(ValueError):
        backtester.run(df, "does_not_exist", {}, 100_000, 5, "1d")


def test_commission_reduces_returns():
    x = np.linspace(0, 24, 300)
    closes = 100 + 15 * np.sin(x / 3) + x
    no_fee = backtester.run(_df(closes), "ema_cross", {}, 100_000, 0, "1d").final_equity
    with_fee = backtester.run(_df(closes), "ema_cross", {}, 100_000, 50, "1d").final_equity
    assert with_fee <= no_fee
